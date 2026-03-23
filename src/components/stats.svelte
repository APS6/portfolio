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
    import { scaleThreshold, scaleTime } from "d3-scale";
    import { timeFormat } from "d3-time-format";
    import { onMount } from "svelte";

    export let totals;
    export let days;
    export let codingByLanguage;
    export let heatmapDays;
    export let heatmapCodingByLanguage;

    const formatTick = timeFormat("%b %d");
    const formatTooltip = timeFormat("%a, %b %d");

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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const seriesData = (days ?? []).map((day) => ({
        date: new Date(day.timestamp * 1000),
        mouse_clicks: day.mouse_clicks ?? 0,
        keystrokes: day.keystrokes ?? 0,
        mouse_scroll_mm: (day.mouse_scroll_mm ?? 0) / 10,
        mouse_distance_mm: (day.mouse_distance_mm ?? 0) / 10,
        chars_written: day.chars_written ?? 0,
        keybinds: day.keybinds ?? 0,
    }));

    const codingRows = codingByLanguage ?? [];
    const heatmapDaysSource = heatmapDays ?? days ?? [];
    const heatmapCodingRows = heatmapCodingByLanguage ?? codingByLanguage ?? [];

    const codingMinutesByDate = new Map();
    for (const row of codingRows) {
        const minutes = (row.seconds ?? 0) / 60;
        codingMinutesByDate.set(
            row.date,
            (codingMinutesByDate.get(row.date) ?? 0) + minutes,
        );
    }

    const heatmapCodingMinutesByDate = new Map();
    for (const row of heatmapCodingRows) {
        const minutes = (row.seconds ?? 0) / 60;
        heatmapCodingMinutesByDate.set(
            row.date,
            (heatmapCodingMinutesByDate.get(row.date) ?? 0) + minutes,
        );
    }

    const timeByLanguageMap = new Map();
    const charsByLanguageMap = new Map();

    for (const row of codingRows) {
        const language = row.language ?? "Unknown";
        const minutes = (row.seconds ?? 0) / 60;
        timeByLanguageMap.set(
            language,
            (timeByLanguageMap.get(language) ?? 0) + minutes,
        );
        charsByLanguageMap.set(
            language,
            (charsByLanguageMap.get(language) ?? 0) + (row.chars_written ?? 0),
        );
    }

    const TOP_LANGUAGES = 10;

    const timeByLanguageAll = Array.from(
        timeByLanguageMap,
        ([language, value]) => ({ language, value }),
    ).sort((a, b) => b.value - a.value);

    const charsByLanguageAll = Array.from(
        charsByLanguageMap,
        ([language, value]) => ({ language, value }),
    ).sort((a, b) => b.value - a.value);

    const timeByLanguage = timeByLanguageAll.slice(0, TOP_LANGUAGES);
    const charsByLanguage = charsByLanguageAll.slice(0, TOP_LANGUAGES);

    const timeLanguages = timeByLanguage.map((row) => row.language);
    const charsLanguages = charsByLanguage.map((row) => row.language);

    const allLanguages = Array.from(
        new Set([
            ...timeByLanguageAll.map((row) => row.language),
            ...charsByLanguageAll.map((row) => row.language),
        ]),
    );

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

    const languageColors = new Map(
        allLanguages.map((language, index) => [
            language,
            languagePalette[index % languagePalette.length],
        ]),
    );

    const languageColorRange = allLanguages.map(
        (language) => languageColors.get(language) ?? "#6e6a86",
    );

    const totalTimeMinutes = timeByLanguageAll.reduce(
        (acc, row) => acc + row.value,
        0,
    );
    const totalChars = charsByLanguageAll.reduce(
        (acc, row) => acc + row.value,
        0,
    );

    const activityMetrics = ["active_minutes", "coding_minutes"];

    const activityLabels = {
        active_minutes: "active minutes",
        coding_minutes: "coding minutes",
    };

    const activityColors = {
        active_minutes: "#c4a7e7",
        coding_minutes: "#ebbcba",
    };

    const activitySeriesData = (days ?? []).map((day) => ({
        date: new Date(day.timestamp * 1000),
        active_minutes: day.active_minutes ?? 0,
        coding_minutes: codingMinutesByDate.get(day.timestamp) ?? 0,
    }));

    const commitHeatmapData = (heatmapDaysSource ?? []).map((day) => ({
        date: new Date(day.timestamp * 1000),
        value: day.git_commits ?? 0,
    }));

    const codingHeatmapData = (heatmapDaysSource ?? []).map((day) => ({
        date: new Date(day.timestamp * 1000),
        value: heatmapCodingMinutesByDate.get(day.timestamp) ?? 0,
    }));

    const commitHeatmapByDate = new Map();
    for (const day of commitHeatmapData) {
        commitHeatmapByDate.set(formatDateKey(day.date), day.value ?? 0);
    }

    const codingHeatmapByDate = new Map();
    for (const day of codingHeatmapData) {
        codingHeatmapByDate.set(formatDateKey(day.date), day.value ?? 0);
    }

    const heatmapMonths = 3;
    const heatmapEndBase =
        commitHeatmapData[commitHeatmapData.length - 1]?.date ?? new Date();
    const heatmapStart = new Date(heatmapEndBase);
    heatmapStart.setDate(1);
    heatmapStart.setMonth(heatmapStart.getMonth() - (heatmapMonths - 1));
    if (heatmapStart.getFullYear() !== heatmapEndBase.getFullYear()) {
        heatmapStart.setFullYear(heatmapEndBase.getFullYear(), 0, 1);
    }
    heatmapStart.setHours(0, 0, 0, 0);

    const heatmapEnd = new Date(heatmapEndBase);
    heatmapEnd.setHours(0, 0, 0, 0);
    heatmapEnd.setDate(heatmapEnd.getDate() + 1);

    let tickCount = 15;

    onMount(() => {
        const mq = window.matchMedia("(max-width: 900px)");

        const update = () => {
            tickCount = mq.matches ? 7 : 15;
        };

        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    });
</script>

<div class="mt-16">
    <div class="flex justify-between items-center">
        <h2 class="text-primary font-semibold text-xl">stats</h2>
        <div
            class="bg-tertiary text-on-tertiary pl-4 pr-2 py-1 rounded-full flex items-center gap-1"
        >
            <span>30 days</span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                ><!-- Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License --><path
                    fill="currentColor"
                    d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
                /></svg
            >
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
        class="bg-surface-variant text-on-surface-variant rounded mt-4 px-8 py-4"
    >
        <div class="h-75">
            <Chart
                data={seriesData}
                x="date"
                xScale={scaleTime()}
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
        class="bg-surface-variant text-on-surface-variant rounded mt-4 px-8 py-4"
    >
        <div class="h-75">
            <Chart
                data={activitySeriesData}
                x="date"
                xScale={scaleTime()}
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
        <div class="bg-surface-variant text-on-surface-variant rounded p-6">
            <div class="h-[260px]">
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
                                class="text-3xl fill-on-surface-variant"
                                dy={2}
                            />
                            <Text
                                value="minutes"
                                textAnchor="middle"
                                verticalAnchor="middle"
                                class="text-xs fill-on-surface-variant/70"
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

        <div class="bg-surface-variant text-on-surface-variant rounded p-6">
            <div class="h-[260px]">
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
                                class="text-3xl fill-on-surface-variant"
                                dy={2}
                            />
                            <Text
                                value="characters"
                                textAnchor="middle"
                                verticalAnchor="middle"
                                class="text-xs fill-on-surface-variant/70"
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
        <div class="bg-surface-variant text-on-surface-variant rounded p-6">
            <h3 class="text-sm text-secondary mb-2">git commits</h3>
            <div class="h-[200px] p-4 border border-tertiary/40 rounded">
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

        <div class="bg-surface-variant text-on-surface-variant rounded p-6">
            <h3 class="text-sm text-secondary mb-2">coding minutes</h3>
            <div class="h-[200px] p-4 border border-tertiary/40 rounded">
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
</style>
