// src/CSVVisualizer.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Treemap,
} from "recharts";
import {
  Upload,
  Download,
  Moon,
  Sun,
  LogOut,
  FileText,
  User,
  Save,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
import Papa from "papaparse";

/* -------------------------
   Configuration / constants
   ------------------------- */
const ADMIN = {
  username: "admin",
  password: "Admin@123",
  fullName: "CodeLense Admin",
  email: "admin@codelense.example",
};

const STORAGE_KEYS = {
  PROFILE: "cl_profile_v2",
  MAPPINGS: "cl_chart_mappings_v4",
  THEME: "cl_theme_v2",
};

const defaultColors = [
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#fb7185",
  "#14b8a6",
];

export default function CSVVisualizer() {
  // ---------- auth & theme ----------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState(null);

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem(STORAGE_KEYS.THEME) === "dark" || true
  );

  useEffect(() => {
    const p = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (p) {
      setProfile(JSON.parse(p));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogin = (e) => {
    e && e.preventDefault();
    if (username === ADMIN.username && password === ADMIN.password) {
      const pf = { name: ADMIN.fullName, email: ADMIN.email };
      setProfile(pf);
      setIsLoggedIn(true);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(pf));
      setUsername("");
      setPassword("");
    } else {
      alert("Invalid credentials (demo). Use admin / Admin@123");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  };

  // ---------- CSV & headers ----------
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [headerSearch, setHeaderSearch] = useState("");

  const [selectedXAxis, setSelectedXAxis] = useState("");
  const [selectedYAxis, setSelectedYAxis] = useState("");
  const [topN, setTopN] = useState(10);

  // persisted mappings
  const [mappings, setMappings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MAPPINGS)) || {};
    } catch {
      return {};
    }
  });

  // ---------- ensure mapping keys and defaults ----------
  const ensureMappingKeys = (cols = []) => {
    const defaults = { globalX: cols[0] || "", globalY: cols[1] || "" };
    return {
      barX: mappings.barX ?? defaults.globalX,
      barY: mappings.barY ?? defaults.globalY,
      barAgg: mappings.barAgg ?? "sum",
      barGroup: mappings.barGroup ?? "none",
      barBinCount: mappings.barBinCount ?? 8,

      lineX: mappings.lineX ?? defaults.globalX,
      lineY: mappings.lineY ?? defaults.globalY,
      lineAgg: mappings.lineAgg ?? "sum",
      lineGroup: mappings.lineGroup ?? "none",
      lineBinCount: mappings.lineBinCount ?? 8,

      pieLabel: mappings.pieLabel ?? defaults.globalX,
      pieValue: mappings.pieValue ?? defaults.globalY,
      pieAgg: mappings.pieAgg ?? "sum",
      pieGroup: mappings.pieGroup ?? "none",
      pieBinCount: mappings.pieBinCount ?? 8,
      pieOthersThreshold: mappings.pieOthersThreshold ?? 0.03,

      areaX: mappings.areaX ?? defaults.globalX,
      areaY: mappings.areaY ?? defaults.globalY,
      areaAgg: mappings.areaAgg ?? "sum",
      areaGroup: mappings.areaGroup ?? "none",
      areaBinCount: mappings.areaBinCount ?? 8,

      treeName: mappings.treeName ?? defaults.globalX,
      treeSize: mappings.treeSize ?? defaults.globalY,
      treeAgg: mappings.treeAgg ?? "sum",
      treeGroup: mappings.treeGroup ?? "none",
      treeBinCount: mappings.treeBinCount ?? 8,

      globalAgg: mappings.globalAgg ?? "sum",
      globalGroup: mappings.globalGroup ?? "none",

      reviewField: mappings.reviewField ?? defaults.globalY,

      useGlobal: mappings.useGlobal ?? false,
    };
  };

  const [localMap, setLocalMap] = useState(ensureMappingKeys(headers));

  useEffect(() => {
    setLocalMap(ensureMappingKeys(headers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const numericHeaders = useMemo(() => {
    if (!csvData || csvData.length === 0) return [];
    const h = Object.keys(csvData[0] || {});
    return h.filter((col) =>
      csvData.every(
        (r) => r[col] === "" || r[col] === null || !isNaN(Number(r[col]))
      )
    );
  }, [csvData]);

  const detectDateColumn = (col) => {
    if (!csvData || !col) return { isDate: false, parseRate: 0 };
    const rows = csvData.slice(0, 200);
    let parsed = 0;
    rows.forEach((r) => {
      const d = new Date(r[col]);
      if (!isNaN(d.getTime())) parsed++;
    });
    return {
      isDate: parsed / rows.length > 0.6,
      parseRate: parsed / rows.length,
    };
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (!data || data.length === 0) {
          alert("CSV is empty or invalid.");
          return;
        }
        const cols = Object.keys(data[0] || {});
        setCsvData(data);
        setHeaders(cols);
        setSelectedXAxis(cols[0] ?? "");
        const numeric = cols.find((c) =>
          data.every(
            (r) => r[c] === "" || r[c] === null || !isNaN(Number(r[c]))
          )
        );
        setSelectedYAxis(numeric ?? cols[1] ?? "");
        const newMap = { ...ensureMappingKeys(cols), useGlobal: false };
        setLocalMap(newMap);
        setMappings((old) => {
          const merged = { ...old, ...newMap };
          localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(merged));
          return merged;
        });
      },
      error: (err) => {
        console.error(err);
        alert("Failed to parse CSV: " + err.message);
      },
    });
  };

  const saveMappings = (m) => {
    const merged = { ...mappings, ...m };
    setMappings(merged);
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(merged));
  };

  const COLORS = defaultColors;
  const escapeHtml = (unsafe) =>
    String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatDateByGranularity = (date, gran) => {
    if (!date || isNaN(date.getTime())) return "Invalid date";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    if (gran === "year") return `${y}`;
    if (gran === "month") return `${y}-${m}`;
    return `${y}-${m}-${d}`;
  };

  const aggregateAndGroup = (
    xKey,
    yKey,
    {
      limit = topN,
      aggregator = "sum",
      groupMode = "none",
      binCount = 8,
      dateGranularity = "month",
      pieOthersThreshold = 0.03,
    } = {}
  ) => {
    if (!csvData || !xKey) return [];

    const pairs = csvData.map((r) => {
      const rawX = r[xKey];
      const rawY = yKey ? Number(r[yKey]) : NaN;
      return { rawX, rawY };
    });

    const isNumericX = pairs.every(
      (p) => p.rawX === "" || p.rawX === null || !isNaN(Number(p.rawX))
    );

    let transformedPairs = pairs;
    if (groupMode === "date") {
      transformedPairs = pairs.map((p) => {
        const d = new Date(p.rawX);
        return {
          rawX: formatDateByGranularity(d, dateGranularity),
          rawY: p.rawY,
        };
      });
    } else if (groupMode === "bins" && isNumericX) {
      const nums = pairs.map((p) => Number(p.rawX)).filter((n) => !isNaN(n));
      if (nums.length === 0) {
        transformedPairs = pairs;
      } else {
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const span = max - min || 1;
        const width = span / binCount;
        transformedPairs = pairs.map((p) => {
          const n = Number(p.rawX);
          if (isNaN(n)) return { rawX: "N/A", rawY: p.rawY };
          let idx = Math.floor((n - min) / width);
          if (idx >= binCount) idx = binCount - 1;
          const binLo = min + idx * width;
          const binHi = binLo + width;
          const label = `${Number(binLo.toFixed(2))}–${Number(
            binHi.toFixed(2)
          )}`;
          return { rawX: label, rawY: p.rawY };
        });
      }
    }

    const map = new Map();
    transformedPairs.forEach(({ rawX, rawY }) => {
      const key = rawX === null || rawX === undefined ? "null" : String(rawX);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(rawY);
    });

    const result = Array.from(map.entries()).map(([k, arr]) => {
      const numericArr = arr.filter((v) => !isNaN(Number(v)));
      const count = arr.length;
      let value = 0;
      if (aggregator === "count") value = count;
      else if (aggregator === "sum")
        value = numericArr.reduce((a, b) => a + Number(b || 0), 0);
      else if (aggregator === "avg")
        value = numericArr.length
          ? numericArr.reduce((a, b) => a + Number(b || 0), 0) /
            numericArr.length
          : 0;
      else if (aggregator === "min")
        value = numericArr.length ? Math.min(...numericArr.map(Number)) : 0;
      else if (aggregator === "max")
        value = numericArr.length ? Math.max(...numericArr.map(Number)) : 0;
      return { name: k, value };
    });

    result.sort((a, b) => b.value - a.value);
    return limit === "all" ? result : result.slice(0, limit);
  };

  // ================= REPORT SVG GENERATORS =================
  // These produce compact inline SVG markup to embed inside the downloaded HTML.
  const createBarChart = (dataOverride) => {
    const data =
      dataOverride ??
      aggregateAndGroup(
        localMap.barX || selectedXAxis,
        localMap.barY || selectedYAxis,
        {
          limit: "all",
          aggregator: localMap.barAgg || "sum",
        }
      );
    if (!data || data.length === 0) return "<p>No data</p>";

    const width = Math.max(700, data.length * 60);
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 120, left: 60 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const maxV = Math.max(...data.map((d) => d.value), 1);
    const barWidth = chartW / data.length - 10;

    const bars = data
      .map((d, i) => {
        const h = (d.value / maxV) * chartH;
        const x = i * (barWidth + 10);
        const y = chartH - h;
        return `<g transform="translate(${margin.left + x}, ${margin.top})">
            <rect x="0" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="${
          COLORS[i % COLORS.length]
        }" />
            <text x="${barWidth / 2}" y="${
          y - 8
        }" font-size="12" text-anchor="middle">${Number(
          d.value
        ).toLocaleString()}</text>
            <text transform="translate(${barWidth / 2}, ${
          chartH + 6
        }) rotate(90)" font-size="11" text-anchor="start">${escapeHtml(
          d.name
        )}</text>
          </g>`;
      })
      .join("");

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fff" />
      <g>${bars}</g>
    </svg>`;
  };

  const createPieChart = (dataOverride) => {
    const raw =
      dataOverride ??
      aggregateAndGroup(
        localMap.pieLabel || selectedXAxis,
        localMap.pieValue || selectedYAxis,
        {
          limit: "all",
          aggregator: localMap.pieAgg || "sum",
        }
      );
    if (!raw || raw.length === 0) return "<p>No data</p>";
    const total = raw.reduce((a, b) => a + b.value, 0) || 1;
    const cx = 200,
      cy = 200,
      r = 140;
    let angle = -Math.PI / 2;
    const slices = raw
      .map((d, i) => {
        const sliceAngle = (d.value / total) * Math.PI * 2;
        const start = angle;
        const end = angle + sliceAngle;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = sliceAngle > Math.PI ? 1 : 0;
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        const mid = (start + end) / 2;
        const lx = cx + (r + 40) * Math.cos(mid);
        const ly = cy + (r + 40) * Math.sin(mid);
        const pct = ((d.value / total) * 100).toFixed(1);
        angle = end;
        return `<g>
            <path d="${path}" fill="${COLORS[i % COLORS.length]}" />
            <text x="${lx}" y="${ly}" font-size="12" text-anchor="middle">${escapeHtml(
          d.name
        )} (${pct}%)</text>
          </g>`;
      })
      .join("");

    return `<svg width="450" height="450" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fff"/>
      ${slices}
    </svg>`;
  };

  const createAreaChart = (dataOverride) => {
    const data =
      dataOverride ??
      aggregateAndGroup(
        localMap.areaX || selectedXAxis,
        localMap.areaY || selectedYAxis,
        {
          limit: "all",
          aggregator: localMap.areaAgg || "sum",
          groupMode: localMap.areaGroup || "none",
        }
      );
    if (!data || data.length === 0) return "<p>No data</p>";

    const width = 900;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;
    const maxV = Math.max(...data.map((d) => d.value), 1);
    const points = data
      .map((d, i) => {
        const x = (chartW / Math.max(data.length - 1, 1)) * i;
        const y = chartH - (d.value / maxV) * chartH;
        return [x, y];
      })
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${p[0] + margin.left} ${p[1] + margin.top}`
      )
      .join(" ");

    const fillPath = `M ${margin.left} ${chartH + margin.top} ${data
      .map((d, i) => {
        const x = (chartW / Math.max(data.length - 1, 1)) * i;
        const y = chartH - (d.value / maxV) * chartH;
        return `L ${x + margin.left} ${y + margin.top}`;
      })
      .join(" ")} L ${margin.left + chartW} ${chartH + margin.top} Z`;

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fff"/>
      <path d="${fillPath}" fill="rgba(139,92,246,0.25)" stroke="none"/>
      <path d="${points}" stroke="#8b5cf6" stroke-width="2" fill="none"/>
    </svg>`;
  };

  const createTreemap = (dataOverride) => {
    const data =
      dataOverride ??
      aggregateAndGroup(
        localMap.treeName || selectedXAxis,
        localMap.treeSize || selectedYAxis,
        {
          limit: "all",
          aggregator: localMap.treeAgg || "sum",
        }
      );
    if (!data || data.length === 0) return "<p>No data</p>";

    const width = 900;
    const height = 220;
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let x = 0;
    const blocks = data
      .map((d, i) => {
        const w = (d.value / total) * width;
        const rect = `<g>
            <rect x="${x}" y="0" width="${w}" height="${height - 30}" fill="${
          COLORS[i % COLORS.length]
        }" />
            <text x="${x + w / 2}" y="${
          height - 8
        }" font-size="12" text-anchor="middle">${escapeHtml(d.name)}</text>
          </g>`;
        x += w;
        return rect;
      })
      .join("");

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fff"/>
      ${blocks}
    </svg>`;
  };

  // ===================== REPORT GENERATION =====================
  const downloadReportHTML = ({ useMapping = false } = {}) => {
    if (!csvData) return alert("Upload CSV first.");

    const map = useMapping ? mappings : localMap;

    // Prepare processed datasets
    const barData = aggregateAndGroup(
      map.globalX || selectedXAxis,
      map.globalY || selectedYAxis,
      { limit: "all", aggregator: map.globalAgg || "sum" }
    );

    const pieData = aggregateAndGroup(
      map.pieLabel || selectedXAxis,
      map.pieValue || selectedYAxis,
      { limit: "all", aggregator: map.pieAgg || "sum" }
    );

    const areaData = aggregateAndGroup(
      map.areaX || selectedXAxis,
      map.areaY || selectedYAxis,
      { limit: "all", aggregator: map.areaAgg || "sum" }
    );

    const treeData = aggregateAndGroup(
      map.treeName || selectedXAxis,
      map.treeSize || selectedYAxis,
      { limit: "all", aggregator: map.treeAgg || "sum" }
    ).map((d) => ({ name: d.name, size: d.value }));

    // SUMMARY METRICS
    const sum = barData.reduce((a, b) => a + b.value, 0);
    const avg = barData.length ? sum / barData.length : 0;
    const max = barData.length ? Math.max(...barData.map((d) => d.value)) : 0;
    const min = barData.length ? Math.min(...barData.map((d) => d.value)) : 0;

    // Build HTML with SVG charts inserted
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"><title>CodeLense Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; padding: 24px; background: #f3f4f6; color: #111; }
    h1 { color: #6b21a8; }
    .stat { padding: 12px; border-radius: 8px; background: #fff; margin-right: 8px; display:inline-block; min-width:120px; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,0.06); }
    .stat .label { font-size:12px; color:#666; }
    .stat .value { font-size:18px; font-weight:700; margin-top:6px; }
    .section { margin-top:28px; }
    .card { background:#fff; padding:12px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.06); margin-top:10px; }
  </style>
</head>
<body>
  <h1>CodeLense — Data Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>

  <div>
    <div class="stat"><div class="label">Records</div><div class="value">${
      barData.length
    }</div></div>
    <div class="stat"><div class="label">Sum</div><div class="value">${sum.toFixed(
      2
    )}</div></div>
    <div class="stat"><div class="label">Avg</div><div class="value">${avg.toFixed(
      2
    )}</div></div>
    <div class="stat"><div class="label">Max</div><div class="value">${max.toFixed(
      2
    )}</div></div>
    <div class="stat"><div class="label">Min</div><div class="value">${min.toFixed(
      2
    )}</div></div>
  </div>

  <div class="section"><h2>Bar Chart</h2><div class="card">${createBarChart(
    barData
  )}</div></div>
  <div class="section"><h2>Pie Chart</h2><div class="card" style="display:flex; align-items:center; justify-content:center;">${createPieChart(
    pieData
  )}</div></div>
  <div class="section"><h2>Area Chart</h2><div class="card">${createAreaChart(
    areaData
  )}
  )}</div></div>

</body>
</html>`;

    // Trigger download
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codelense-report-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  // ================= END downloadReportHTML =====================

  const downloadCSV = () => {
    if (!csvData) return alert("Upload CSV first.");
    const s = Papa.unparse(csvData);
    const blob = new Blob([s], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codelense-data-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filteredHeaders = headers.filter((h) =>
    h.toLowerCase().includes(headerSearch.toLowerCase())
  );

  const currentMap = {
    ...ensureMappingKeys(headers),
    ...mappings,
    ...localMap,
  };

  // Chart datasets
  const barChartData = aggregateAndGroup(
    currentMap.barX || selectedXAxis,
    currentMap.barY || selectedYAxis,
    {
      limit: topN,
      aggregator: currentMap.barAgg || "sum",
      groupMode: currentMap.barGroup || "none",
      binCount: Number(currentMap.barBinCount) || 8,
      dateGranularity: currentMap.barDateGranularity || "month",
    }
  );

  const lineChartData = aggregateAndGroup(
    currentMap.lineX || selectedXAxis,
    currentMap.lineY || selectedYAxis,
    {
      limit: "all",
      aggregator: currentMap.lineAgg || "sum",
      groupMode: currentMap.lineGroup || "none",
      binCount: Number(currentMap.lineBinCount) || 8,
      dateGranularity: currentMap.lineDateGranularity || "month",
    }
  );

  const rawPie = aggregateAndGroup(
    currentMap.pieLabel || selectedXAxis,
    currentMap.pieValue || selectedYAxis,
    {
      limit: "all",
      aggregator: currentMap.pieAgg || "sum",
      groupMode: currentMap.pieGroup || "none",
      binCount: Number(currentMap.pieBinCount) || 8,
      dateGranularity: currentMap.pieDateGranularity || "month",
    }
  );

  const pieOthersThreshold = Number(currentMap.pieOthersThreshold) || 0.03;
  const pieSorted = [...rawPie].sort((a, b) => b.value - a.value);
  const pieTotal = pieSorted.reduce((a, b) => a + b.value, 0) || 1;
  const piePrimary = [];
  let othersSum = 0;
  pieSorted.forEach((p) => {
    if (p.value / pieTotal < pieOthersThreshold) othersSum += p.value;
    else piePrimary.push(p);
  });
  const pieChartData = piePrimary
    .concat(othersSum > 0 ? [{ name: "Others", value: othersSum }] : [])
    .slice(0, topN === "all" ? undefined : topN);

  const areaChartData = aggregateAndGroup(
    currentMap.areaX || selectedXAxis,
    currentMap.areaY || selectedYAxis,
    {
      limit: topN,
      aggregator: currentMap.areaAgg || "sum",
      groupMode: currentMap.areaGroup || "none",
      binCount: Number(currentMap.areaBinCount) || 8,
      dateGranularity: currentMap.areaDateGranularity || "month",
    }
  );

  const treeChartData = aggregateAndGroup(
    currentMap.treeName || selectedXAxis,
    currentMap.treeSize || selectedYAxis,
    {
      limit: "all",
      aggregator: currentMap.treeAgg || "sum",
      groupMode: currentMap.treeGroup || "none",
      binCount: Number(currentMap.treeBinCount) || 8,
      dateGranularity: currentMap.treeDateGranularity || "month",
    }
  ).map((d) => ({ name: d.name, size: d.value }));

  const [reviewField, setReviewField] = useState(localMap.reviewField || "");

  useEffect(() => {
    if (localMap.reviewField) setReviewField(localMap.reviewField);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localMap.reviewField, headers]);

  const setLocalAndSave = (key, value) => {
    const newLocal = { ...localMap, [key]: value };
    setLocalMap(newLocal);
  };

  const onSaveLocalToPersistent = () => {
    saveMappings(localMap);
    alert("Mappings saved to localStorage.");
  };

  const onResetMappings = () => {
    const defaults = ensureMappingKeys(headers);
    setLocalMap(defaults);
    setMappings({});
    localStorage.removeItem(STORAGE_KEYS.MAPPINGS);
  };

  const computeReviewStats = (field) => {
    if (!csvData || !field) return null;
    const vals = csvData
      .map((r) => {
        const v = r[field];
        const n = Number(v);
        return isNaN(n) ? null : n;
      })
      .filter((v) => v !== null && v !== undefined);
    if (!vals || vals.length === 0)
      return { count: 0, sum: 0, avg: 0, max: 0, min: 0, values: [] };

    const count = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    return { count, sum, avg, max, min, values: vals };
  };

  // Fix tooltip styles for readability in dark mode
  const commonTooltipProps = {
    contentStyle: {
      backgroundColor: isDark ? "#111827" : "#fff",
      color: isDark ? "#fff" : "#000",
      border: "1px solid #333",
    },
    labelStyle: { color: isDark ? "#fff" : "#000" },
    itemStyle: { color: isDark ? "#fff" : "#000" },
  };

  // ---------- RENDER ----------
  if (!isLoggedIn) {
    return (
      <div
        className={
          isDark
            ? "bg-gray-900 min-h-screen text-white"
            : "bg-gray-100 min-h-screen text-gray-900"
        }
      >
        <div className="max-w-xl mx-auto p-8">
          <div
            className={
              isDark
                ? "bg-gray-800 p-8 rounded-2xl shadow"
                : "bg-white p-8 rounded-2xl shadow"
            }
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">CodeLense</h1>
                <p className="text-sm text-gray-400">
                  Upload CSV & visualize — demo login
                </p>
              </div>
              <div className="text-gray-400">
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="p-2 rounded hover:bg-gray-700/40"
                >
                  {isDark ? <Sun /> : <Moon />}
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Username</label>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  placeholder="Admin@123"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-purple-600 px-4 py-2 rounded text-white"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("admin");
                    setPassword("Admin@123");
                  }}
                  className="px-4 py-2 rounded border"
                >
                  Fill Demo
                </button>
              </div>
            </form>

            <p className="mt-4 text-xs text-gray-400">
              Demo authentication — replace with real backend for production.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isDark
          ? "bg-gray-900 min-h-screen text-white"
          : "bg-gray-50 min-h-screen text-gray-900"
      }
    >
      {/* Header */}
      <header
        className={isDark ? "bg-gray-800 p-4 shadow" : "bg-white p-4 shadow"}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 w-12 h-12 flex items-center justify-center text-white font-bold">
              CL
            </div>
            <div>
              <h2 className="text-2xl font-semibold">CODELENSE</h2>
              <div className="text-sm text-gray-400">
                Decode the chaos — CSV visualizer
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-md bg-gray-700 flex items-center gap-2">
              <User size={16} />
              <div className="text-sm">
                <div className="font-medium">{profile?.name}</div>
                <div className="text-xs text-gray-300">{profile?.email}</div>
              </div>
            </div>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded hover:bg-gray-700/40"
              title="Toggle theme"
            >
              {isDark ? <Sun /> : <Moon />}
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded bg-red-600 hover:opacity-90 flex items-center gap-2"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Controls / Upload */}
      <main className="max-w-7xl mx-auto p-6">
        <section
          className={
            isDark
              ? "bg-gray-800 p-5 rounded-2xl shadow"
              : "bg-white p-5 rounded-2xl shadow"
          }
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded cursor-pointer">
                <Upload size={16} />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>

              <button
                onClick={downloadCSV}
                disabled={!csvData}
                className="flex items-center gap-2 px-3 py-2 rounded bg-gray-700 hover:opacity-90 disabled:opacity-40"
              >
                <Download size={14} /> Download CSV
              </button>

              <button
                onClick={() => downloadReportHTML({ useMapping: false })}
                disabled={!csvData}
                className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 hover:opacity-90 disabled:opacity-40 text-white"
              >
                <FileText size={14} /> Download Report (HTML)
              </button>

              <button
                onClick={() => downloadReportHTML({ useMapping: true })}
                disabled={!csvData}
                className="flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 hover:opacity-90 disabled:opacity-40 text-white"
              >
                <Save size={14} /> Report (use saved mappings)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">Top N</div>
              <select
                value={topN}
                onChange={(e) => setTopN(e.target.value)}
                className="p-2 rounded bg-gray-700"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value="all">All</option>
              </select>

              <button
                onClick={() => {
                  setLocalMap(ensureMappingKeys(headers));
                }}
                title="Reset selectors to defaults"
                className="p-2 rounded bg-gray-700 hover:opacity-90"
              >
                <RefreshCw size={14} />
              </button>

              <div className="flex items-center gap-2">
                <input
                  placeholder="Search headers..."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  className="p-2 rounded bg-gray-700 text-white"
                />
                <Search size={16} />
              </div>
            </div>
          </div>

          {/* Global selectors */}
          <div className="mt-4 flex gap-3 flex-wrap items-center">
            <div className="text-sm text-gray-400">Global X</div>
            <select
              value={selectedXAxis}
              onChange={(e) => setSelectedXAxis(e.target.value)}
              className="p-2 rounded bg-gray-700"
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-400">Global Y</div>
            <select
              value={selectedYAxis}
              onChange={(e) => setSelectedYAxis(e.target.value)}
              className="p-2 rounded bg-gray-700"
            >
              {numericHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <div className="ml-auto flex gap-2 items-center">
              <div className="text-sm text-gray-400">Global Agg</div>
              <select
                value={localMap.globalAgg}
                onChange={(e) => setLocalAndSave("globalAgg", e.target.value)}
                className="p-2 rounded bg-gray-700"
              >
                <option value="sum">Sum</option>
                <option value="avg">Avg</option>
                <option value="count">Count</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>

              <div className="text-sm text-gray-400">Global Group</div>
              <select
                value={localMap.globalGroup}
                onChange={(e) => setLocalAndSave("globalGroup", e.target.value)}
                className="p-2 rounded bg-gray-700"
              >
                <option value="none">None</option>
                <option value="date">Date</option>
              </select>

              <button
                onClick={onSaveLocalToPersistent}
                disabled={!csvData}
                className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-40 flex items-center gap-2"
              >
                <Save size={14} /> Save mappings
              </button>
              <button
                onClick={onResetMappings}
                className="px-3 py-2 rounded border flex items-center gap-2"
              >
                <Settings size={14} /> Reset
              </button>
            </div>
          </div>

          {/* date detection hint */}
          {csvData &&
            selectedXAxis &&
            (() => {
              const det = detectDateColumn(selectedXAxis);
              if (det.parseRate > 0.1 && det.parseRate < 0.99) {
                return (
                  <div className="mt-2 text-xs text-amber-300">
                    Hint: column "<strong>{selectedXAxis}</strong>" parses as
                    date for {Math.round(det.parseRate * 100)}% of sample rows —
                    use Date grouping for month/year/day.
                  </div>
                );
              }
              if (det.parseRate >= 0.99) {
                return (
                  <div className="mt-2 text-xs text-green-400">
                    Column "<strong>{selectedXAxis}</strong>" looks like dates —
                    try grouping by month/year for better trend charts.
                  </div>
                );
              }
              return null;
            })()}
        </section>

        {!csvData ? (
          <div className="mt-8 p-10 bg-gray-800 rounded-2xl text-center text-gray-300">
            <div className="text-2xl mb-2">Upload a CSV file to visualize</div>
            <div className="text-sm">
              Try a CSV with columns: name, grade, class, score, city
            </div>
          </div>
        ) : (
          <>
            {/* Charts area */}
            <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar */}
              <div className="bg-gray-800 p-5 rounded-2xl shadow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">Bar Chart</h3>
                  <div className="text-xs text-gray-400">
                    Use per-chart selectors or global defaults
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="text-sm w-20">X-axis</div>
                    <select
                      value={localMap.barX}
                      onChange={(e) =>
                        setLocalMap((l) => ({ ...l, barX: e.target.value }))
                      }
                      className="p-2 rounded bg-gray-700 min-w-[160px]"
                    >
                      {filteredHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <div className="text-sm w-20">Y-axis</div>
                    <select
                      value={localMap.barY}
                      onChange={(e) =>
                        setLocalMap((l) => ({ ...l, barY: e.target.value }))
                      }
                      className="p-2 rounded bg-gray-700 min-w-[160px]"
                    >
                      {numericHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <div className="text-sm w-14">Agg</div>
                    <select
                      value={localMap.barAgg}
                      onChange={(e) =>
                        setLocalMap((l) => ({ ...l, barAgg: e.target.value }))
                      }
                      className="p-2 rounded bg-gray-700 min-w-[110px]"
                    >
                      <option value="sum">Sum</option>
                      <option value="avg">Avg</option>
                      <option value="count">Count</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                    </select>

                    <div className="text-sm w-14">Group</div>
                    <select
                      value={localMap.barGroup}
                      onChange={(e) =>
                        setLocalMap((l) => ({ ...l, barGroup: e.target.value }))
                      }
                      className="p-2 rounded bg-gray-700 min-w-[120px]"
                    >
                      <option value="none">None</option>
                      <option value="bins">Bins</option>
                      <option value="date">Date</option>
                    </select>

                    <div className="text-sm w-20">Bins</div>
                    <input
                      type="number"
                      min={1}
                      value={localMap.barBinCount}
                      onChange={(e) =>
                        setLocalMap((l) => ({
                          ...l,
                          barBinCount: Number(e.target.value),
                        }))
                      }
                      className="p-2 rounded bg-gray-700 w-20"
                    />

                    <button
                      onClick={() => {
                        saveMappings({
                          barX: localMap.barX,
                          barY: localMap.barY,
                          barAgg: localMap.barAgg,
                          barGroup: localMap.barGroup,
                          barBinCount: localMap.barBinCount,
                        });
                      }}
                      className="ml-auto px-3 py-2 rounded bg-purple-600 text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={
                        barChartData.length
                          ? barChartData
                          : [{ name: "No data", value: 0 }]
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip {...commonTooltipProps} />
                      <Legend />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {barChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* REVIEW CARD */}
              <div className="bg-gray-800 p-5 rounded-2xl shadow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">Data Review</h3>
                  <div className="text-xs text-gray-400">
                    Select a numeric field — shows Sum, Avg, Max, Min, Count
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="text-sm w-28">Review field</div>
                    <select
                      value={reviewField}
                      onChange={(e) => {
                        setReviewField(e.target.value);
                        setLocalMap((l) => ({
                          ...l,
                          reviewField: e.target.value,
                        }));
                      }}
                      className="p-2 rounded bg-gray-700 min-w-[180px]"
                    >
                      <option value="">-- select numeric field --</option>
                      {numericHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        const toSave = { reviewField };
                        saveMappings(toSave);
                        alert("Review field saved.");
                      }}
                      className="ml-auto px-3 py-2 rounded bg-purple-600 text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  {(() => {
                    if (!reviewField) {
                      return (
                        <div className="text-gray-400">
                          Choose a numeric field to view summary metrics.
                        </div>
                      );
                    }
                    const stats = computeReviewStats(reviewField);
                    if (!stats || stats.count === 0) {
                      return (
                        <div className="text-gray-400">
                          No numeric data found for field{" "}
                          <strong>{reviewField}</strong>.
                        </div>
                      );
                    }

                    const metrics = [
                      { key: "Sum", value: stats.sum },
                      { key: "Average", value: stats.avg },
                      { key: "Max", value: stats.max },
                      { key: "Min", value: stats.min },
                      { key: "Count", value: stats.count },
                    ];

                    return (
                      <>
                        <div className="flex gap-4 items-center">
                          {metrics.slice(0, 4).map((m) => (
                            <div
                              key={m.key}
                              className="p-3 bg-gray-900 rounded-lg flex-1"
                            >
                              <div className="text-xs text-gray-400">
                                {m.key}
                              </div>
                              <div className="text-xl font-bold">
                                {Number(m.value).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          ))}
                          <div className="p-3 bg-gray-900 rounded-lg w-28 text-center">
                            <div className="text-xs text-gray-400">Count</div>
                            <div className="text-xl font-bold">
                              {stats.count}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* Pie (full width) */}
            <div className="bg-gray-800 p-5 rounded-2xl shadow lg:col-span-2 mt-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">Pie / Donut Chart</h3>
                <div className="text-xs text-gray-400">
                  Categorical distribution (with "Others")
                </div>
              </div>

              <div className="mt-3 flex gap-2 items-center flex-wrap">
                <div className="text-sm w-20">Label</div>
                <select
                  value={localMap.pieLabel}
                  onChange={(e) =>
                    setLocalMap((l) => ({ ...l, pieLabel: e.target.value }))
                  }
                  className="p-2 rounded bg-gray-700 min-w-[160px]"
                >
                  {filteredHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <div className="text-sm w-20">Value</div>
                <select
                  value={localMap.pieValue}
                  onChange={(e) =>
                    setLocalMap((l) => ({ ...l, pieValue: e.target.value }))
                  }
                  className="p-2 rounded bg-gray-700 min-w-[160px]"
                >
                  {numericHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>

                <div className="text-sm w-14">Agg</div>
                <select
                  value={localMap.pieAgg}
                  onChange={(e) =>
                    setLocalMap((l) => ({ ...l, pieAgg: e.target.value }))
                  }
                  className="p-2 rounded bg-gray-700 min-w-[110px]"
                >
                  <option value="sum">Sum</option>
                  <option value="count">Count</option>
                  <option value="avg">Avg</option>
                </select>

                <div className="text-sm w-14">Group</div>
                <select
                  value={localMap.pieGroup}
                  onChange={(e) =>
                    setLocalMap((l) => ({ ...l, pieGroup: e.target.value }))
                  }
                  className="p-2 rounded bg-gray-700 min-w-[120px]"
                >
                  <option value="none">None</option>
                  <option value="date">Date</option>
                </select>

                <div className="text-sm w-20">Bins</div>
                <input
                  type="number"
                  min={1}
                  value={localMap.pieBinCount}
                  onChange={(e) =>
                    setLocalMap((l) => ({
                      ...l,
                      pieBinCount: Number(e.target.value),
                    }))
                  }
                  className="p-2 rounded bg-gray-700 w-20"
                />

                <div className="text-sm w-28">Others %</div>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={0.5}
                  value={localMap.pieOthersThreshold}
                  onChange={(e) =>
                    setLocalMap((l) => ({
                      ...l,
                      pieOthersThreshold: Number(e.target.value),
                    }))
                  }
                  className="p-2 rounded bg-gray-700 w-20"
                />

                <button
                  onClick={() =>
                    saveMappings({
                      pieLabel: localMap.pieLabel,
                      pieValue: localMap.pieValue,
                      pieAgg: localMap.pieAgg,
                      pieGroup: localMap.pieGroup,
                      pieBinCount: localMap.pieBinCount,
                      pieOthersThreshold: localMap.pieOthersThreshold,
                    })
                  }
                  className="ml-auto px-3 py-2 rounded bg-purple-600 text-white"
                >
                  Save
                </button>
              </div>

              <div className="mt-4">
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie
                      data={
                        pieChartData.length
                          ? pieChartData
                          : [{ name: "No data", value: 1 }]
                      }
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={56}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pieChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...commonTooltipProps} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Area / Treemap row */}
            <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Area */}
              <div className="bg-gray-800 p-5 rounded-2xl shadow">
                <h3 className="text-lg font-semibold">Area Chart</h3>

                <div className="mt-3 flex gap-2 items-center flex-wrap">
                  <div className="text-sm w-20">X-axis</div>
                  <select
                    value={localMap.areaX}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, areaX: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[160px]"
                  >
                    {filteredHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm w-20">Y-axis</div>
                  <select
                    value={localMap.areaY}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, areaY: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[160px]"
                  >
                    {numericHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm w-14">Agg</div>
                  <select
                    value={localMap.areaAgg}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, areaAgg: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[110px]"
                  >
                    <option value="sum">Sum</option>
                    <option value="avg">Avg</option>
                    <option value="count">Count</option>
                  </select>

                  <div className="text-sm w-14">Group</div>
                  <select
                    value={localMap.areaGroup}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, areaGroup: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[120px]"
                  >
                    <option value="none">None</option>
                    <option value="bins">Bins</option>
                    <option value="date">Date</option>
                  </select>

                  <div className="text-sm w-20">Bins</div>
                  <input
                    type="number"
                    min={1}
                    value={localMap.areaBinCount}
                    onChange={(e) =>
                      setLocalMap((l) => ({
                        ...l,
                        areaBinCount: Number(e.target.value),
                      }))
                    }
                    className="p-2 rounded bg-gray-700 w-20"
                  />

                  <button
                    onClick={() =>
                      saveMappings({
                        areaX: localMap.areaX,
                        areaY: localMap.areaY,
                        areaAgg: localMap.areaAgg,
                        areaGroup: localMap.areaGroup,
                        areaBinCount: localMap.areaBinCount,
                      })
                    }
                    className="ml-auto px-3 py-2 rounded bg-purple-600 text-white"
                  >
                    Save
                  </button>
                </div>

                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={
                        areaChartData.length
                          ? areaChartData
                          : [{ name: "No data", value: 0 }]
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip {...commonTooltipProps} />
                      <Area
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Treemap */}
              <div className="bg-gray-800 p-5 rounded-2xl shadow">
                <h3 className="text-lg font-semibold">Treemap</h3>

                <div className="mt-3 flex gap-2 items-center flex-wrap">
                  <div className="text-sm w-20">Name</div>
                  <select
                    value={localMap.treeName}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, treeName: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[160px]"
                  >
                    {filteredHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm w-20">Size</div>
                  <select
                    value={localMap.treeSize}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, treeSize: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[160px]"
                  >
                    {numericHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>

                  <div className="text-sm w-14">Agg</div>
                  <select
                    value={localMap.treeAgg}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, treeAgg: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[110px]"
                  >
                    <option value="sum">Sum</option>
                    <option value="avg">Avg</option>
                    <option value="count">Count</option>
                  </select>

                  <div className="text-sm w-14">Group</div>
                  <select
                    value={localMap.treeGroup}
                    onChange={(e) =>
                      setLocalMap((l) => ({ ...l, treeGroup: e.target.value }))
                    }
                    className="p-2 rounded bg-gray-700 min-w-[120px]"
                  >
                    <option value="none">None</option>
                    <option value="bins">Bins</option>
                    <option value="date">Date</option>
                  </select>

                  <div className="text-sm w-20">Bins</div>
                  <input
                    type="number"
                    min={1}
                    value={localMap.treeBinCount}
                    onChange={(e) =>
                      setLocalMap((l) => ({
                        ...l,
                        treeBinCount: Number(e.target.value),
                      }))
                    }
                    className="p-2 rounded bg-gray-700 w-20"
                  />

                  <button
                    onClick={() =>
                      saveMappings({
                        treeName: localMap.treeName,
                        treeSize: localMap.treeSize,
                        treeAgg: localMap.treeAgg,
                        treeGroup: localMap.treeGroup,
                        treeBinCount: localMap.treeBinCount,
                      })
                    }
                    className="ml-auto px-3 py-2 rounded bg-purple-600 text-white"
                  >
                    Save
                  </button>
                </div>

                <div className="mt-4 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={
                        treeChartData.length
                          ? treeChartData
                          : [{ name: "No data", size: 1 }]
                      }
                      dataKey="size"
                      ratio={4 / 3}
                      stroke="#fff"
                      fill="#8b5cf6"
                    />
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Footer small stats + mapping controls */}
            <section className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="text-xs text-gray-400">Records</div>
                <div className="px-3 py-2 bg-gray-800 rounded">
                  {csvData.length}
                </div>

                <div className="text-xs text-gray-400">Headers</div>
                <div className="px-3 py-2 bg-gray-800 rounded">
                  {headers.length}
                </div>

                <div className="text-xs text-gray-400">Numeric columns</div>
                <div className="px-3 py-2 bg-gray-800 rounded">
                  {numericHeaders.length}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    saveMappings(localMap);
                  }}
                  className="px-3 py-2 rounded bg-green-600 text-white flex items-center gap-2"
                >
                  <Save size={14} /> Save All
                </button>
                <button
                  onClick={() => {
                    setLocalMap(ensureMappingKeys(headers));
                  }}
                  className="px-3 py-2 rounded border flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Reset Selectors
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* Small Stat card used earlier inside Data Review (if you want to reuse) */
function StatCard({ label, value }) {
  return (
    <div className="p-3 bg-gray-900 rounded-lg">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-xl font-bold">
        {Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}
