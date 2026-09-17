# @diagram-kit/cli

Render a diagram-kit graph (YAML, JSON, Mermaid, tree text, or a directory) to
an SVG or PNG file, without writing any code.

```sh
npx @diagram-kit/cli render architecture.yaml -o architecture.svg
npx @diagram-kit/cli render ./src --format directory -o structure.png --scale 2
```

```
Usage: diagram-kit render <input> -o <file> [options]

Options:
  -o, --out <file>          output path, ending in .svg or .png
  -f, --format <format>     input format: yaml, json, mermaid, tree, directory
                             (auto-detected when omitted)
  -l, --layout <mode>       layout mode: graph, structural, stack, cycle
                             (default: "graph")
  --direction <direction>   graph layout direction: TB, BT, LR, RL
  --node-sizing <mode>      responsive (grow to fit label) or fixed
                             (truncate with ellipsis)
  --preset <name>           theme preset
  --mode <mode>             light or dark (default: "light")
  --padding <px>            margin around the diagram, in pixels (default: "24")
  --colorize-nodes          tint entity backgrounds with their category color,
                             not just an accent dot
  --glass                   frosted-glass entities over a soft gradient backdrop
  --scale <n>               PNG output pixel scale (default: "2")
```

Part of the diagram-kit monorepo. See the repo root README for the full
picture.
