import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { fetchAnalytics as fetchAnalyticsApi } from '../lib/api';
import './Analytics.css';

function Analytics() {
  const { settings, theme } = useSettings();
  const cs = settings.currency_symbol || '₹';

  const [currentInterval, setCurrentInterval] = useState(
    () => localStorage.getItem('analytics_interval') || 'hourly'
  );
  const [currentChartType, setCurrentChartType] = useState(
    () => localStorage.getItem('analytics_chart_type') || 'line'
  );
  const [currentMetric, setCurrentMetric] = useState(
    () => localStorage.getItem('analytics_metric') || 'revenue'
  );
  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem('analytics_date');
    return saved ? new Date(parseInt(saved)) : new Date();
  });
  const [dateDisplay, setDateDisplay] = useState('Loading...');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const flatpickrInstanceRef = useRef(null);

  // Format date for API
  const formatDateForAPI = useCallback((d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const formatDisplayDate = useCallback((dateStr, interval, endStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    if (interval === 'hourly') {
      return d.toLocaleDateString(undefined, options);
    }
    const e = new Date(endStr + 'T00:00:00');
    const startShort = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endShort = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startShort} - ${endShort}`;
  }, []);

  // Init chart
  const initChart = useCallback(async () => {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();
    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Poppins', sans-serif";

    const datasetConfig = {
      label: currentMetric === 'revenue' ? `Revenue (${cs})` : 'Check-ins',
      data: [],
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: currentChartType === 'bar' ? 4 : 0,
      hoverBackgroundColor: 'rgba(99, 102, 241, 0.8)',
    };

    if (currentChartType === 'line') {
      datasetConfig.tension = 0.4;
      datasetConfig.fill = true;
      datasetConfig.backgroundColor = 'rgba(99, 102, 241, 0.1)';
      datasetConfig.borderWidth = 3;
      datasetConfig.pointBackgroundColor = 'rgba(99, 102, 241, 1)';
      datasetConfig.pointRadius = 4;
      datasetConfig.pointHoverRadius = 6;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    chartInstanceRef.current = new Chart(ctx, {
      type: currentChartType,
      data: { labels: [], datasets: [datasetConfig] },
      options: {
        animation: { duration: 600 },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { size: 13, family: 'Poppins' },
            bodyFont: { size: 14, family: 'Poppins', weight: 'bold' },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: gridColor, drawBorder: false },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }, [currentChartType, currentMetric, cs]);

  // Fetch data
  const fetchData = useCallback(async () => {
    const apiDate = formatDateForAPI(currentDate);
    try {
      const { body: data } = await fetchAnalyticsApi(currentInterval, currentMetric, apiDate);
      if (data.error) return;
      setDateDisplay(formatDisplayDate(data.start, currentInterval, data.end));

      if (chartInstanceRef.current) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();

        chartInstanceRef.current.data.labels = data.labels;
        chartInstanceRef.current.data.datasets[0].data = data.data;
        chartInstanceRef.current.options.scales.y.grid.color = gridColor;
        chartInstanceRef.current.options.scales.x.ticks.color = textColor;
        chartInstanceRef.current.options.scales.y.ticks.color = textColor;
        chartInstanceRef.current.update();
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  }, [currentDate, currentInterval, currentMetric, formatDateForAPI, formatDisplayDate]);

  // Initialize chart and flatpickr
  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      await initChart();
      if (!mounted) return;
      fetchData();

      // Init flatpickr
      const flatpickrMod = await import('flatpickr');
      await import('flatpickr/dist/flatpickr.min.css');
      const fp = flatpickrMod.default;
      if (!mounted) return;

      flatpickrInstanceRef.current = fp('#aesthetic-date-picker', {
        disableMobile: true,
        defaultDate: currentDate,
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            setCurrentDate(selectedDates[0]);
            localStorage.setItem('analytics_date', selectedDates[0].getTime());
          }
        },
      });
    };

    setup();

    return () => {
      mounted = false;
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      if (flatpickrInstanceRef.current) flatpickrInstanceRef.current.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when date/interval/metric changes
  useEffect(() => {
    if (chartInstanceRef.current) {
      fetchData();
    }
  }, [currentDate, currentInterval, currentMetric, fetchData]);

  // Rebuild chart when chart type changes
  useEffect(() => {
    if (chartInstanceRef.current) {
      initChart().then(() => fetchData());
    }
  }, [currentChartType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update chart colors on theme change
  useEffect(() => {
    if (chartInstanceRef.current) {
      const isDark = theme === 'dark';
      const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();
      chartInstanceRef.current.options.scales.y.grid.color = gridColor;
      chartInstanceRef.current.options.scales.x.ticks.color = textColor;
      chartInstanceRef.current.options.scales.y.ticks.color = textColor;
      chartInstanceRef.current.update();
    }
  }, [theme]);

  const switchInterval = useCallback((interval) => {
    if (currentInterval === interval) return;
    setCurrentInterval(interval);
    localStorage.setItem('analytics_interval', interval);
  }, [currentInterval]);

  const switchChartType = useCallback((type) => {
    if (currentChartType === type) return;
    setCurrentChartType(type);
    localStorage.setItem('analytics_chart_type', type);
  }, [currentChartType]);

  const switchMetric = useCallback((metric) => {
    if (currentMetric === metric) return;
    setCurrentMetric(metric);
    localStorage.setItem('analytics_metric', metric);
  }, [currentMetric]);

  const shiftDate = useCallback((direction) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentInterval === 'hourly') d.setDate(d.getDate() + direction);
      else d.setDate(d.getDate() + direction * 7);
      localStorage.setItem('analytics_date', d.getTime());
      return d;
    });
  }, [currentInterval]);

  // Toggle classes for toggle-bg animation
  const intervalClass = `toggle-container interval-toggle ${currentInterval === 'daily' ? 'daily' : ''}`;
  const chartTypeClass = `toggle-container chart-type-toggle ${currentChartType === 'line' ? 'line' : ''}`;
  const metricClass = `toggle-container metric-toggle ${currentMetric === 'revenue' ? 'revenue' : ''}`;

  const chartTitle = currentMetric === 'revenue' ? 'Check-in Revenue' : 'Number of Check-ins';

  return (
    <>
      <div className="analytics-header">
        <button className="btn mobile-menu-btn" onClick={() => setMobileMenuOpen((p) => !p)}>
          <i className="bx bx-slider-alt" /> Chart Options
        </button>
        <div className={`analytics-toggles-wrapper ${mobileMenuOpen ? 'show' : ''}`} id="analytics-toggles-menu">
          <div className={metricClass}>
            <div className="toggle-bg" />
            <button
              className={`toggle-btn ${currentMetric === 'customers' ? 'active' : ''}`}
              onClick={() => switchMetric('customers')}
            >
              <i className="bx bx-group" /> Customers
            </button>
            <button
              className={`toggle-btn ${currentMetric === 'revenue' ? 'active' : ''}`}
              onClick={() => switchMetric('revenue')}
            >
              <i className="bx bx-coin-stack" /> Revenue
            </button>
          </div>
          <div className={chartTypeClass}>
            <div className="toggle-bg" />
            <button
              className={`toggle-btn ${currentChartType === 'bar' ? 'active' : ''}`}
              onClick={() => switchChartType('bar')}
            >
              <i className="bx bx-bar-chart" /> Bar
            </button>
            <button
              className={`toggle-btn ${currentChartType === 'line' ? 'active' : ''}`}
              onClick={() => switchChartType('line')}
            >
              <i className="bx bx-line-chart" /> Line
            </button>
          </div>
          <div className={intervalClass}>
            <div className="toggle-bg" />
            <button
              className={`toggle-btn ${currentInterval === 'hourly' ? 'active' : ''}`}
              onClick={() => switchInterval('hourly')}
            >
              Hourly
            </button>
            <button
              className={`toggle-btn ${currentInterval === 'daily' ? 'active' : ''}`}
              onClick={() => switchInterval('daily')}
            >
              Daily
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card analytics-card">
        <div className="chart-header">
          <h2 className="chart-title">{chartTitle}</h2>
          <div className="date-controls">
            <i className="bx bx-chevron-left date-nav-btn" onClick={() => shiftDate(-1)} />
            <span id="date-display">{dateDisplay}</span>
            <i className="bx bx-chevron-right date-nav-btn" onClick={() => shiftDate(1)} />
          </div>
          <div className="picker-container">
            <button id="aesthetic-date-picker" className="btn date-picker-btn">
              <i className="bx bx-calendar" /> Pick Date
            </button>
          </div>
        </div>
        <div className="chart-container">
          <canvas ref={chartRef} />
        </div>
      </div>
    </>
  );
}

export default memo(Analytics);
