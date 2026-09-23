"""Check max lines per file for Python backend.
Teto: 500 linhas por arquivo.
"""
import os
import sys

MAX_LINES = 500
SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'src')

def check_files():
    violations = []
    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.endswith('.py'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as fh:
                    lines = sum(1 for _ in fh)
                if lines > MAX_LINES:
                    rel = os.path.relpath(path, os.path.dirname(__file__))
                    violations.append((rel, lines))

    if violations:
        violations.sort(key=lambda x: -x[1])
        print(f"Found {len(violations)} files over {MAX_LINES} lines:")
        for path, lines in violations:
            print(f"  {lines:5d}  {path}")
        return 1
    else:
        print(f"All files under {MAX_LINES} lines.")
        return 0

if __name__ == '__main__':
    sys.exit(check_files())
