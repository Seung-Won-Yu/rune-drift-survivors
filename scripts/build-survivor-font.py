"""Rebuild the self-hosted display subset after Korean UI copy changes.

Usage: python3 scripts/build-survivor-font.py /path/to/NotoSerifKR[wght].ttf
Requires fonttools[woff]; this is an asset-authoring tool, not a runtime/build dependency.
Source and redistribution license: public/fonts/README.md and OFL-NotoSerifKR.txt.
"""
import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
texts = ''.join(p.read_text() for p in sorted((root / 'src/survivor').glob('*.js')))
texts += (root / 'survivor/index.html').read_text()
characters = sorted({c for c in texts if ord(c) >= 32})
font = TTFont(args.source, recalcTimestamp=False)
font = instantiateVariableFont(font, {'wght': 700}, inplace=True)
options = subset.Options()
options.flavor = 'woff2'
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=''.join(characters))
subsetter.subset(font)
font.flavor = 'woff2'
target = root / 'public/fonts/ash-journal-700.woff2'
font.save(target)
missing = {ord(c) for c in characters if '\uac00' <= c <= '\ud7a3'} - set(font.getBestCmap())
if missing:
    raise RuntimeError(f'Missing Hangul characters: {missing}')
print(f'{target.name}: {target.stat().st_size:,} bytes; {len(characters)} source characters; complete Hangul coverage')
