// KLL generation from KiiConf download.php (non-LTS path).
interface Trigger {
  action: string;
}

export interface MatrixKey {
  layers: Record<string, { key: string }>;
  triggers?: Record<string, Trigger[]> | null;
}

export interface Layout {
  header: Record<string, string>;
  matrix: MatrixKey[];
  defines?: { name: string; value: string }[];
  animations?: Record<string, { settings: string; frames: string[] }>;
  custom?: Record<string, string>;
}

function binding(value: string): string {
  const match = /^((CONS|SYS|#):)?(.+)/is.exec(value);
  if (!match) return `U"${value}"`;
  const [, , kind, rest] = match;
  if (kind === '#') return rest;
  if (kind === 'CONS' || kind === 'SYS') return `${kind}"${rest}"`;
  return `U"${value}"`;
}

function animationBlock(name: string, settings: string, frames: string[]): string {
  let block = `A[${name}] <= ${settings};\n`;
  let index = 1;
  for (const frame of frames) {
    if (frame.startsWith('#')) {
      block += `${frame}\n`;
    } else {
      block += `A[${name}, ${index}] <= ${frame};\n`;
      index++;
    }
  }
  return index > 1 ? block : `### ${name} is empty, skipping`;
}

export function generateKll(config: Layout, defaultMatrix: MatrixKey[]): Map<string, string> {
  const { header } = config;
  // Keys match the default layout by position, as in download.php.
  const layers = new Map<number, Map<string, string>>();
  const triggers = new Map<number, Map<string, Trigger[]>>();

  config.matrix.forEach((key, i) => {
    const base = defaultMatrix[i].layers['0'].key;
    for (const [layer, { key: bound }] of Object.entries(key.layers)) {
      const n = Number(layer);
      if (!layers.has(n)) layers.set(n, new Map());
      layers.get(n)!.set(base, bound);
    }
    for (const [layer, list] of Object.entries(key.triggers ?? {})) {
      const n = Number(layer);
      if (!triggers.has(n)) triggers.set(n, new Map());
      triggers.get(n)!.set(base, list);
    }
  });

  const headerText = Object.entries(header)
    .map(([k, v]) => `${k} = "${v}";`)
    .join('\n');
  const defines = (config.defines ?? []).map((d) => `${d.name} = "${d.value}";\n`).join('\n');
  const animations = Object.entries(config.animations ?? {})
    .map(([name, a]) => animationBlock(name, a.settings, a.frames))
    .join('\n');

  const files = new Map<string, string>();
  const maxLayer = Math.max(...layers.keys());
  for (let n = 0; n <= maxLayer; n++) {
    const body = [...(layers.get(n) ?? [])].map(([k, v]) => `U"${k}" : ${binding(v)};`).join('\n');
    const triggerText = [...(triggers.get(n) ?? [])]
      .flatMap(([k, list]) => list.map((t) => `U"${k}" :+ ${t.action};`))
      .join('\n');
    const customText = config.custom?.[String(n)];
    const custom = customText ? `\n\n${customText}` : '';
    const content =
      n === 0
        ? `${headerText}\n\n${defines}\n\n${body}\n\n${triggerText}${custom}\n\n${animations}\n\n`
        : `${headerText}\n\n${body}\n\n${triggerText}${custom}\n\n`;
    files.set(`${header.Name}-${header.Layout}-${n}.kll`, content);
  }
  return files;
}
