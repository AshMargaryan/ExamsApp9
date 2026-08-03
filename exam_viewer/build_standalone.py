#!/usr/bin/env python3
"""
Build a standalone HTML file that works by double-clicking (no server needed).

USAGE:
    python3 build_standalone.py

This reads data.json + index.html + render.js and produces:
    exam_standalone.html   <- open this directly in any browser

Run this again every time you change data.json.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    # --- read the data ---
    data_path = os.path.join(HERE, 'data.json')
    if not os.path.exists(data_path):
        print("ERROR: data.json not found next to this script.")
        sys.exit(1)

    with open(data_path, encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print("ERROR: data.json is not valid JSON.")
            print("  ", e)
            sys.exit(1)

    n = len(data.get('questions', []))
    if n == 0:
        print("ERROR: data.json has no questions.")
        sys.exit(1)

    # --- read the template + script ---
    with open(os.path.join(HERE, 'index.html'), encoding='utf-8') as f:
        html = f.read()
    with open(os.path.join(HERE, 'render.js'), encoding='utf-8') as f:
        render_js = f.read()

    # --- replace the fetch-loader with inline data + inline script ---
    start = html.find('<script>\n// Load exam data')
    end = html.find('</script>', start) + len('</script>')
    if start == -1 or end == -1:
        print("ERROR: could not locate the loader block in index.html.")
        sys.exit(1)

    data_js = json.dumps(data, ensure_ascii=False)
    inline_block = (
        '<script>\nconst EXAM_DATA = ' + data_js + ';\n</script>\n'
        '<script>\n' + render_js + '\n</script>'
    )

    out_html = html[:start] + inline_block + html[end:]

    out_path = os.path.join(HERE, 'exam_standalone.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out_html)

    size_kb = os.path.getsize(out_path) // 1024
    print("Built exam_standalone.html")
    print("  Questions: {}".format(n))
    print("  Size: {} KB".format(size_kb))
    print("")
    print("Open exam_standalone.html directly in your browser.")
    print("(Keep the katex_assets folder next to it.)")

if __name__ == '__main__':
    main()
