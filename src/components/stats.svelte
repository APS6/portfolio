<script>
    import {
        Area,
        Axis,
        Calendar,
        Chart,
        Group,
        Highlight,
        Pie,
        Svg,
        Text,
        Tooltip,
    } from "layerchart";
    import { scaleThreshold, scaleUtc } from "d3-scale";
    import { utcFormat } from "d3-time-format";
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { actions } from "astro:actions";

    export let totals;
    export let days;
    export let codingByLanguage;
    export let heatmapDays;
    export let heatmapCodingByLanguage;
    let tickCount = 15;

    const durationOptions = [
        { value: "90", label: "3 months" },
        { value: "30", label: "30 days" },
        { value: "7", label: "7 days" },
        { value: "2", label: "48 hours" },
    ];

    let selectedDuration = durationOptions[1];
    let durationMenuOpen = false;

    const toggleDurationMenu = () => {
        durationMenuOpen = !durationMenuOpen;
    };

    const selectDuration = async (option) => {
        selectedDuration = option;
        durationMenuOpen = false;
        useHourly = Number(selectedDuration.value) < 7;
        updateTickCount();
        if (useHourly) {
            const { data, error } = await actions.fetchHours(
                selectedDuration.value,
            );
            if (!error && data) {
                totals = data.totals;
                hours = data.hours;
                codingByLanguage = data.codingByLanguage;
            }
        } else {
            const { data, error } = await actions.fetchDays(
                selectedDuration.value,
            );
            if (!error && data) {
                totals = data.totals;
                days = data.days;
                codingByLanguage = data.codingByLanguage;
            }
        }
    };

    const formatTickDay = utcFormat("%b %d");
    const formatTickHour = utcFormat("%H:%M");
    const formatTooltipDay = utcFormat("%a, %b %d");
    const formatTooltipHour = (value) => {
        const start = utcFormat("%a, %b %d · %H:%M")(value);
        const end = utcFormat("%H:%M")(
            new Date(value.getTime() + 60 * 60 * 1000),
        );
        return `${start} - ${end} IST`;
    };
    const IST_OFFSET_MINUTES = 330;
    const toIST = (value) =>
        new Date(value.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
    const formatTick = (value) =>
        useHourly ? formatTickHour(toIST(value)) : formatTickDay(value);
    const formatTooltip = (value) =>
        useHourly ? formatTooltipHour(toIST(value)) : formatTooltipDay(value);

    const metrics = [
        "keystrokes",
        "mouse_clicks",
        "mouse_scroll_mm",
        "mouse_distance_mm",
        "chars_written",
        "keybinds",
    ];

    const metricLabels = {
        mouse_clicks: "mouse clicks",
        keystrokes: "keystrokes",
        mouse_scroll_mm: "mouse scroll",
        mouse_distance_mm: "mouse travel",
        chars_written: "code characters",
        keybinds: "keybinds",
    };

    const metricColors = {
        mouse_clicks: "#9ccfd8",
        keystrokes: "#ebbcba",
        mouse_scroll_mm: "#31748f",
        mouse_distance_mm: "#ea9d34",
        chars_written: "#f2e9e1",
        keybinds: "#eb6f92",
    };

    const numberFormat = new Intl.NumberFormat("en-US");

    const gitHeatmapColors = ["#403d52", "#9be9a8", "#40c463", "#216e39"];
    const codeHeatmapColors = ["#403d52", "#b9d3ff", "#6aa9ff", "#2f6fed"];

    const formatMetricValue = (metric, value) => {
        if (value == null) return "0";
        if (metric === "mouse_distance_mm" || metric === "mouse_scroll_mm") {
            return `${value.toFixed(1)} cm`;
        }
        return numberFormat.format(Math.round(value));
    };

    const formatMinutesValue = (value) => {
        if (value == null) return "0 min";
        return `${numberFormat.format(Math.round(value))} minutes`;
    };

    const formatCharsValue = (value) => {
        if (value == null) return "0";
        return numberFormat.format(Math.round(value)) + " characters";
    };

    const formatDateKey = (date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const normalizeHeatmapDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate(),
            ),
        );
    };

    const normalizeTimestamp = (timestamp, stepSeconds) =>
        Math.floor(timestamp / stepSeconds) * stepSeconds;

    const buildFilledRows = (rows, stepSeconds, durationDays) => {
        const countSteps = Math.max(
            1,
            Math.round(durationDays * (stepSeconds === 3600 ? 24 : 1)),
        );

        const normalizedRows = new Map();
        for (const row of rows ?? []) {
            const ts = normalizeTimestamp(row.timestamp, stepSeconds);
            normalizedRows.set(ts, { ...row, timestamp: ts });
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        const endBase =
            normalizedRows.size > 0
                ? Math.max(...normalizedRows.keys())
                : nowSeconds;
        const end = normalizeTimestamp(endBase, stepSeconds);
        const start = end - (countSteps - 1) * stepSeconds;

        const emptyRow = {
            mouse_clicks: 0,
            keystrokes: 0,
            mouse_scroll_mm: 0,
            mouse_distance_mm: 0,
            chars_written: 0,
            keybinds: 0,
            active_minutes: 0,
            coding_minutes: 0,
        };

        const filled = [];
        for (let ts = start; ts <= end; ts += stepSeconds) {
            const row = normalizedRows.get(ts);
            filled.push(
                row ? { ...emptyRow, ...row } : { ...emptyRow, timestamp: ts },
            );
        }
        return filled;
    };

    let hours = [];
    let useHourly = false;
    let timeSeriesRows = [];
    let filledTimeSeriesRows = [];
    let seriesData = [];
    let codingRows = [];
    let heatmapDaysSource = [];
    let heatmapCodingRows = [];
    let heatmapCodingMinutesByDate = new Map();
    let timeByLanguageMap = new Map();
    let charsByLanguageMap = new Map();
    const TOP_LANGUAGES = 10;
    let timeByLanguageAll = [];
    let charsByLanguageAll = [];
    let timeByLanguage = [];
    let charsByLanguage = [];
    let timeLanguages = [];
    let charsLanguages = [];
    let allLanguages = [];
    const languagePalette = [
        "#eb6f92",
        "#f6c177",
        "#9ccfd8",
        "#31748f",
        "#c4a7e7",
        "#ebbcba",
        "#ea9d34",
        "#f2e9e1",
        "#908caa",
        "#6e6a86",
    ];
    let languageColors = new Map();
    let languageColorRange = [];
    let totalTimeMinutes = 0;
    let totalChars = 0;

    const activityMetrics = ["active_minutes", "coding_minutes"];

    const activityLabels = {
        active_minutes: "active minutes",
        coding_minutes: "coding minutes",
    };

    const activityColors = {
        active_minutes: "#c4a7e7",
        coding_minutes: "#ebbcba",
    };

    let activitySeriesData = [];
    let commitHeatmapData = [];
    let codingHeatmapData = [];
    let commitHeatmapByDate = new Map();
    let codingHeatmapByDate = new Map();
    const heatmapMonths = 3;
    let heatmapEndBase = new Date();
    let heatmapStart = new Date();
    let heatmapEnd = new Date();

    $: timeSeriesRows = useHourly ? (hours ?? []) : (days ?? []);
    $: filledTimeSeriesRows = buildFilledRows(
        timeSeriesRows,
        useHourly ? 3600 : 86400,
        Number(selectedDuration.value),
    );

    $: seriesData = (filledTimeSeriesRows ?? []).map((row) => ({
        date: new Date(row.timestamp * 1000),
        mouse_clicks: row.mouse_clicks ?? 0,
        keystrokes: row.keystrokes ?? 0,
        mouse_scroll_mm: (row.mouse_scroll_mm ?? 0) / 10,
        mouse_distance_mm: (row.mouse_distance_mm ?? 0) / 10,
        chars_written: row.chars_written ?? 0,
        keybinds: row.keybinds ?? 0,
    }));

    $: codingRows = codingByLanguage ?? [];
    $: heatmapDaysSource = heatmapDays ?? days ?? [];
    $: heatmapCodingRows = heatmapCodingByLanguage ?? codingByLanguage ?? [];

    $: {
        heatmapCodingMinutesByDate = new Map();
        for (const row of heatmapCodingRows) {
            const minutes = (row.seconds ?? 0) / 60;
            heatmapCodingMinutesByDate.set(
                row.date,
                (heatmapCodingMinutesByDate.get(row.date) ?? 0) + minutes,
            );
        }
    }

    $: {
        timeByLanguageMap = new Map();
        charsByLanguageMap = new Map();

        for (const row of codingRows) {
            const language = row.language ?? "Unknown";
            const minutes = (row.seconds ?? 0) / 60;
            timeByLanguageMap.set(
                language,
                (timeByLanguageMap.get(language) ?? 0) + minutes,
            );
            charsByLanguageMap.set(
                language,
                (charsByLanguageMap.get(language) ?? 0) +
                    (row.chars_written ?? 0),
            );
        }
    }

    $: timeByLanguageAll = Array.from(
        timeByLanguageMap,
        ([language, value]) => ({ language, value }),
    ).sort((a, b) => b.value - a.value);

    $: charsByLanguageAll = Array.from(
        charsByLanguageMap,
        ([language, value]) => ({ language, value }),
    ).sort((a, b) => b.value - a.value);

    $: timeByLanguage = timeByLanguageAll.slice(0, TOP_LANGUAGES);
    $: charsByLanguage = charsByLanguageAll.slice(0, TOP_LANGUAGES);

    $: timeLanguages = timeByLanguage.map((row) => row.language);
    $: charsLanguages = charsByLanguage.map((row) => row.language);

    $: allLanguages = Array.from(
        new Set([
            ...timeByLanguageAll.map((row) => row.language),
            ...charsByLanguageAll.map((row) => row.language),
        ]),
    );

    $: languageColors = new Map(
        allLanguages.map((language, index) => [
            language,
            languagePalette[index % languagePalette.length],
        ]),
    );

    $: languageColorRange = allLanguages.map(
        (language) => languageColors.get(language) ?? "#6e6a86",
    );

    $: totalTimeMinutes = timeByLanguageAll.reduce(
        (acc, row) => acc + row.value,
        0,
    );
    $: totalChars = charsByLanguageAll.reduce((acc, row) => acc + row.value, 0);

    $: activitySeriesData = (filledTimeSeriesRows ?? []).map((row) => ({
        date: new Date(row.timestamp * 1000),
        active_minutes: row.active_minutes ?? 0,
        coding_minutes: row.coding_minutes ?? 0,
    }));

    $: commitHeatmapData = (heatmapDaysSource ?? []).map((day) => ({
        date: normalizeHeatmapDate(day.timestamp),
        value: day.git_commits ?? 0,
    }));

    $: codingHeatmapData = (heatmapDaysSource ?? []).map((day) => ({
        date: normalizeHeatmapDate(day.timestamp),
        value: heatmapCodingMinutesByDate.get(day.timestamp) ?? 0,
    }));

    $: {
        commitHeatmapByDate = new Map();
        for (const day of commitHeatmapData) {
            commitHeatmapByDate.set(formatDateKey(day.date), day.value ?? 0);
        }
    }

    $: {
        codingHeatmapByDate = new Map();
        for (const day of codingHeatmapData) {
            codingHeatmapByDate.set(formatDateKey(day.date), day.value ?? 0);
        }
    }

    heatmapEnd.setUTCHours(0, 0, 0, 0);
    heatmapEnd.setUTCDate(heatmapEnd.getUTCDate() + 1);
    $: {
        heatmapEndBase =
            commitHeatmapData[commitHeatmapData.length - 1]?.date ?? new Date();
        heatmapStart = new Date(heatmapEndBase);
        heatmapStart.setUTCDate(1);
        heatmapStart.setUTCMonth(
            heatmapStart.getUTCMonth() - (heatmapMonths - 1),
        );
        if (heatmapStart.getUTCFullYear() !== heatmapEndBase.getUTCFullYear()) {
            heatmapStart.setUTCFullYear(heatmapEndBase.getUTCFullYear(), 0, 1);
        }
        heatmapStart.setUTCHours(0, 0, 0, 0);

        heatmapEnd = new Date(heatmapEndBase);
        heatmapEnd.setUTCHours(0, 0, 0, 0);
        heatmapEnd.setUTCDate(heatmapEnd.getUTCDate() + 1);
    }

    let mq;

    const updateTickCount = () => {
        if (!mq) return;
        if (mq.matches) {
            if (selectedDuration.value < 7) {
                tickCount = 4;
            } else {
                tickCount = 5;
            }
        } else {
            if (selectedDuration.value < 7) {
                tickCount = 12;
            } else if (selectedDuration.value < 15) {
                tickCount = selectedDuration.value;
            } else {
                tickCount = 15;
            }
        }
    };

    onMount(() => {
        mq = window.matchMedia("(max-width: 900px)");

        updateTickCount();
        mq.addEventListener("change", updateTickCount);
        return () => mq.removeEventListener("change", updateTickCount);
    });
</script>

<div id="stats" class="mt-16">
    <div class="flex justify-between items-center">
        <h2 class="text-primary font-semibold text-xl">stats</h2>
        <div class="relative">
            <button
                type="button"
                class="group bg-tertiary text-on-tertiary pl-4 pr-2 py-1 rounded-full flex items-center gap-1 cursor-pointer"
                aria-haspopup="true"
                aria-expanded={durationMenuOpen}
                on:click={toggleDurationMenu}
            >
                <span class="font-medium">{selectedDuration.label}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    class="transition-transform group-hover:translate-y-0.5"
                    class:rotate-180={durationMenuOpen}
                >
                    <path
                        fill="currentColor"
                        d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
                    />
                </svg>
            </button>
            {#if durationMenuOpen}
                <div
                    class="absolute right-0 z-50 mt-2 w-40 rounded-xl bg-surface text-on-surface border border-outline shadow-xl backdrop-blur-sm overflow-hidden"
                    transition:fly={{ y: -6, duration: 160 }}
                >
                    {#each durationOptions as option}
                        <button
                            class={`w-full text-left px-4 py-2 hover:bg-surface-variant/60 transition cursor-pointer ${
                                selectedDuration.value === option.value
                                    ? "bg-surface-variant/60"
                                    : ""
                            }`}
                            on:click={() => selectDuration(option)}
                        >
                            {option.label}
                            <span class="text-xs text-secondary"
                                >{option.value >= 7
                                    ? "UTC"
                                    : "IST (UTC+5:30)"}</span
                            >
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
    <div class="flex flex-wrap gap-2 mt-3">
        <div
            class="flex flex-col items-center flex-1 px-2 py-1.5 bg-surface-variant border-2 border-tertiary text-secondary rounded-md"
        >
            <h3 class="text-center">mouse clicks</h3>
            <span class="text-2xl"
                >{(totals.mouse_clicks / 1000).toFixed(1)}k</span
            >
        </div>
        <div
            class="flex flex-col items-center flex-1 px-2 py-1.5 bg-surface-variant border-2 border-tertiary text-secondary rounded-md"
        >
            <h3 class="text-center">mouse travel</h3>
            <span class="text-2xl"
                >{(totals.mouse_distance_mm / 1000).toFixed(1)}<span
                    class="text-sm">m</span
                ></span
            >
        </div>
        <div
            class="flex flex-col items-center flex-1 px-2 py-1.5 bg-surface-variant border-2 border-tertiary text-secondary rounded-md"
        >
            <h3 class="text-center">mouse scroll</h3>
            <span class="text-2xl"
                >{(totals.mouse_scroll_mm / 1000).toFixed(1)}<span
                    class="text-sm">m</span
                ></span
            >
        </div>
        <div
            class="flex flex-col items-center flex-1 px-2 py-1.5 bg-surface-variant border-2 border-tertiary text-secondary rounded-md"
        >
            <h3 class="text-center">code chars</h3>
            <span class="text-2xl"
                >{(totals.chars_written / 1000).toFixed(1)}k</span
            >
        </div>
        <div
            class="flex flex-col items-center flex-1 px-2 py-1.5 bg-surface-variant border-2 border-tertiary text-secondary rounded-md"
        >
            <h3 class="text-center">keystrokes</h3>
            <span class="text-2xl"
                >{(totals.keystrokes / 1000).toFixed(1)}k</span
            >
        </div>
        <div
            class="flex flex-col items-center flex-1 px-2 py-1.5 bg-surface-variant border-2 border-tertiary text-secondary rounded-md"
        >
            <h3 class="text-center">keybinds</h3>
            <span class="text-2xl">{(totals.keybinds / 1000).toFixed(1)}k</span>
        </div>
    </div>
    <div
        class="bg-surface-variant text-on-surface-variant rounded border-2 border-outline mt-4 px-8 py-4"
    >
        <div class="h-75 chart-touch-scroll">
            <Chart
                data={seriesData}
                x="date"
                xScale={scaleUtc()}
                y={metrics}
                yDomain={[0, null]}
                padding={{ left: 32, bottom: 24, right: 0 }}
                tooltip={{ mode: "bisect-x" }}
            >
                <Svg>
                    <Axis
                        placement="left"
                        rule
                        tickLength={5}
                        tickLabelProps={{ dx: -10 }}
                        classes={{
                            rule: "stroke-on-surface-variant/40 ",
                            tick: "stroke-on-surface-variant/40 ",
                            tickLabel: "fill-on-surface-variant text-xs mr-1",
                        }}
                    />
                    <Axis
                        placement="bottom"
                        format={formatTick}
                        tickLength={6}
                        ticks={tickCount}
                        tickLabelProps={{
                            dy: 8,
                        }}
                        rule
                        classes={{
                            rule: "stroke-on-surface-variant/40 ",
                            tick: "stroke-on-surface-variant/40 ",
                            tickLabel: "fill-on-surface-variant text-xs",
                        }}
                    />

                    {#each metrics as metric}
                        <Area
                            y1={(d) => d[metric]}
                            fill={metricColors[metric]}
                            fillOpacity={0.15}
                            line={{
                                stroke: metricColors[metric],
                                class: "stroke-2",
                            }}
                        />
                        <Highlight
                            y={(d) => d[metric]}
                            points={{ fill: metricColors[metric] }}
                        />
                    {/each}
                    <Highlight lines />
                </Svg>

                <Tooltip.Root
                    classes={{
                        container:
                            "bg-surface text-on-surface border-secondary border rounded-lg p-4 text-xs",
                        content: "",
                    }}
                    let:data
                >
                    <Tooltip.Header>{formatTooltip(data.date)}</Tooltip.Header>
                    <Tooltip.List>
                        {#each metrics as metric}
                            <Tooltip.Item
                                label={metricLabels[metric]}
                                value={formatMetricValue(metric, data[metric])}
                                color={metricColors[metric]}
                            />
                        {/each}
                    </Tooltip.List>
                </Tooltip.Root>
            </Chart>
        </div>
        <div
            class="mt-3 flex flex-wrap justify-center gap-3 text-xs text-secondary"
        >
            {#each metrics as metric}
                <div class="flex items-center gap-2">
                    <span
                        class="h-2.5 w-2.5 rounded-full"
                        style={`background-color: ${metricColors[metric]};`}
                    ></span>
                    <span>{metricLabels[metric]}</span>
                </div>
            {/each}
        </div>
    </div>

    <div
        class="bg-surface-variant text-on-surface-variant rounded border-2 border-outline mt-4 px-8 py-4"
    >
        <div class="h-75 chart-touch-scroll">
            <Chart
                data={activitySeriesData}
                x="date"
                xScale={scaleUtc()}
                y={activityMetrics}
                yDomain={[0, null]}
                padding={{ left: 32, bottom: 24, right: 0 }}
                tooltip={{ mode: "bisect-x" }}
            >
                <Svg>
                    <Axis
                        placement="left"
                        rule
                        tickLength={5}
                        tickLabelProps={{ dx: -10 }}
                        classes={{
                            rule: "stroke-on-surface-variant/40 ",
                            tick: "stroke-on-surface-variant/40 ",
                            tickLabel: "fill-on-surface-variant text-xs mr-1",
                        }}
                    />
                    <Axis
                        placement="bottom"
                        format={formatTick}
                        tickLength={6}
                        ticks={tickCount}
                        tickLabelProps={{
                            dy: 8,
                        }}
                        rule
                        classes={{
                            rule: "stroke-on-surface-variant/40 ",
                            tick: "stroke-on-surface-variant/40 ",
                            tickLabel: "fill-on-surface-variant text-xs",
                        }}
                    />

                    {#each activityMetrics as metric}
                        <Area
                            y1={(d) => d[metric]}
                            fill={activityColors[metric]}
                            fillOpacity={0.15}
                            line={{
                                stroke: activityColors[metric],
                                class: "stroke-2",
                            }}
                        />
                        <Highlight
                            y={(d) => d[metric]}
                            points={{ fill: activityColors[metric] }}
                        />
                    {/each}
                    <Highlight lines />
                </Svg>

                <Tooltip.Root
                    classes={{
                        container:
                            "bg-surface text-on-surface border-secondary border rounded-lg p-4 text-xs",
                        content: "",
                    }}
                    let:data
                >
                    <Tooltip.Header>{formatTooltip(data.date)}</Tooltip.Header>
                    <Tooltip.List>
                        {#each activityMetrics as metric}
                            <Tooltip.Item
                                label={activityLabels[metric]}
                                value={formatMinutesValue(data[metric])}
                                color={activityColors[metric]}
                            />
                        {/each}
                    </Tooltip.List>
                </Tooltip.Root>
            </Chart>
        </div>
        <div
            class="mt-2 flex flex-wrap justify-center gap-3 text-xs text-secondary"
        >
            {#each activityMetrics as metric}
                <div class="flex items-center gap-2">
                    <span
                        class="h-2.5 w-2.5 rounded-full"
                        style={`background-color: ${activityColors[metric]};`}
                    ></span>
                    <span>{activityLabels[metric]}</span>
                </div>
            {/each}
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div
            class="bg-surface-variant text-on-surface-variant rounded border-2 border-outline p-6"
        >
            <div class="h-65 chart-touch-scroll">
                <Chart
                    data={timeByLanguageAll}
                    x="value"
                    c="language"
                    cDomain={allLanguages}
                    cRange={languageColorRange}
                    tooltip={{ mode: "manual" }}
                    let:tooltip
                >
                    <Svg>
                        <Group center>
                            <Pie
                                innerRadius={-20}
                                cornerRadius={5}
                                padAngle={0.02}
                                {tooltip}
                            />
                            <Text
                                value={numberFormat.format(
                                    Math.round(totalTimeMinutes),
                                )}
                                textAnchor="middle"
                                verticalAnchor="middle"
                                class="text-3xl fill-on-surface-variant select-none"
                                dy={2}
                            />
                            <Text
                                value="minutes"
                                textAnchor="middle"
                                verticalAnchor="middle"
                                class="text-xs fill-on-surface-variant/70 select-none"
                                dy={20}
                            />
                        </Group>
                    </Svg>

                    <Tooltip.Root
                        classes={{
                            container:
                                "bg-surface text-on-surface border-secondary border rounded-lg p-4 text-xs",
                            content: "",
                        }}
                        let:data
                    >
                        <Tooltip.Header>{data.language}</Tooltip.Header>
                        <Tooltip.List>
                            <Tooltip.Item
                                value={formatMinutesValue(data.value)}
                                color={languageColors.get(data.language)}
                            />
                        </Tooltip.List>
                    </Tooltip.Root>
                </Chart>
            </div>
            <div class="mt-3 flex flex-wrap gap-3 text-xs text-secondary">
                {#each timeLanguages as language}
                    <div class="flex items-center gap-2">
                        <span
                            class="h-2.5 w-2.5 rounded-full"
                            style={`background-color: ${languageColors.get(language)};`}
                        ></span>
                        <span>{language}</span>
                    </div>
                {/each}
            </div>
        </div>

        <div
            class="bg-surface-variant text-on-surface-variant rounded border-2 border-outline p-6"
        >
            <div class="h-65 chart-touch-scroll">
                <Chart
                    data={charsByLanguageAll}
                    x="value"
                    c="language"
                    cDomain={allLanguages}
                    cRange={languageColorRange}
                    tooltip={{ mode: "manual" }}
                    let:tooltip
                >
                    <Svg>
                        <Group center>
                            <Pie
                                innerRadius={-20}
                                cornerRadius={5}
                                padAngle={0.02}
                                {tooltip}
                            />
                            <Text
                                value={numberFormat.format(
                                    Math.round(totalChars),
                                )}
                                textAnchor="middle"
                                verticalAnchor="middle"
                                class="text-3xl fill-on-surface-variant select-none"
                                dy={2}
                            />
                            <Text
                                value="characters"
                                textAnchor="middle"
                                verticalAnchor="middle"
                                class="text-xs fill-on-surface-variant/70 select-none"
                                dy={20}
                            />
                        </Group>
                    </Svg>

                    <Tooltip.Root
                        classes={{
                            container:
                                "bg-surface text-on-surface border-secondary border rounded-lg p-4 text-xs",
                            content: "",
                        }}
                        let:data
                    >
                        <Tooltip.Header>{data.language}</Tooltip.Header>
                        <Tooltip.List>
                            <Tooltip.Item
                                value={formatCharsValue(data.value)}
                                color={languageColors.get(data.language)}
                            />
                        </Tooltip.List>
                    </Tooltip.Root>
                </Chart>
            </div>
            <div class="mt-3 flex flex-wrap gap-3 text-xs text-secondary">
                {#each charsLanguages as language}
                    <div class="flex items-center gap-2">
                        <span
                            class="h-2.5 w-2.5 rounded-full"
                            style={`background-color: ${languageColors.get(language)};`}
                        ></span>
                        <span>{language}</span>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div
            class="bg-surface-variant text-on-surface-variant rounded border-2 border-outline p-6"
        >
            <h3 class="text-sm text-secondary mb-2">git commits</h3>
            <div
                class="h-50 p-4 border border-outline rounded chart-touch-scroll"
            >
                <Chart
                    data={commitHeatmapData}
                    x="date"
                    c={(d) =>
                        commitHeatmapByDate.get(formatDateKey(d.date)) ?? 0}
                    cScale={scaleThreshold().unknown(gitHeatmapColors[0])}
                    cDomain={[1, 3, 6]}
                    cRange={gitHeatmapColors}
                    let:tooltip
                >
                    <Svg>
                        <Calendar
                            start={heatmapStart}
                            end={heatmapEnd}
                            {tooltip}
                            monthPath
                            rx={6}
                            ry={6}
                            stroke="var(--color-surface-variant)"
                            strokeWidth={2}
                        />
                    </Svg>

                    <Tooltip.Root
                        classes={{
                            container:
                                "bg-surface text-on-surface border-secondary border rounded-lg p-4 text-xs",
                            content: "",
                        }}
                        let:data
                    >
                        <Tooltip.Header
                            >{formatTooltip(data.date)}</Tooltip.Header
                        >

                        <Tooltip.List>
                            <Tooltip.Item
                                label="commits"
                                value={numberFormat.format(
                                    Math.round(
                                        commitHeatmapByDate.get(
                                            formatDateKey(data.date),
                                        ) ?? 0,
                                    ),
                                )}
                                valueAlign="right"
                            />
                        </Tooltip.List>
                    </Tooltip.Root>
                </Chart>
            </div>
        </div>

        <div
            class="bg-surface-variant text-on-surface-variant rounded border-2 border-outline p-6"
        >
            <h3 class="text-sm text-secondary mb-2">coding minutes</h3>
            <div
                class="h-50 p-4 border border-outline rounded chart-touch-scroll"
            >
                <Chart
                    data={codingHeatmapData}
                    x="date"
                    c={(d) =>
                        codingHeatmapByDate.get(formatDateKey(d.date)) ?? 0}
                    cScale={scaleThreshold().unknown(codeHeatmapColors[0])}
                    cDomain={[15, 30, 60]}
                    cRange={codeHeatmapColors}
                    let:tooltip
                >
                    <Svg>
                        <Calendar
                            start={heatmapStart}
                            end={heatmapEnd}
                            {tooltip}
                            monthPath
                            rx={6}
                            ry={6}
                            stroke="var(--color-surface-variant)"
                            strokeWidth={2}
                        />
                    </Svg>

                    <Tooltip.Root
                        classes={{
                            container:
                                "bg-surface text-on-surface border-secondary border rounded-lg p-4 text-xs",
                            content: "",
                        }}
                        let:data
                    >
                        <Tooltip.Header
                            >{formatTooltip(data.date)}</Tooltip.Header
                        >

                        <Tooltip.List>
                            <Tooltip.Item
                                label="minutes"
                                value={formatMinutesValue(
                                    codingHeatmapByDate.get(
                                        formatDateKey(data.date),
                                    ) ?? 0,
                                )}
                                valueAlign="right"
                            />
                        </Tooltip.List>
                    </Tooltip.Root>
                </Chart>
            </div>
        </div>
    </div>
</div>

<style>
    :global(.fill-surface-content) {
        fill: var(--color-on-surface-variant);
    }

    .chart-touch-scroll {
        touch-action: pan-y;
    }

    :global(#stats .TooltipContext) {
        touch-action: pan-y !important;
    }

    :global(#stats svg text) {
        user-select: none;
        -webkit-user-select: none;
        pointer-events: none;
    }
</style>
