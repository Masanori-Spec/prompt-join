#!/usr/bin/env python3
"""Literal independent fixture oracle. Does not derive expectations from native HTML."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artifacts/native'
EXPECTED = {
    'a': {'text': 'Alpha café 🌟\nCue one\nLocal A\nEnd A', 'base': '#203040',
          'weight': 400, 'italic': False, 'emphasis': [6, 10, '#cc2244', '#fff080', True],
          'markers': [('Cue one', 14, 65), ('Local A', 22, 0)]},
    'b': {'text': 'Beta 東京\nCue two\nLocal B\nEnd B', 'base': '#405060',
          'weight': 600, 'italic': True, 'emphasis': [5, 7, '#1266aa', '#aaffcc', False],
          'markers': [('Cue two', 8, 65), ('Local B', 16, 0)]},
}

def check(record, spec):
    assert record['realQmlEngine'] is True
    assert record['documentClass'] == 'QQuickTextDocument'
    assert record['text'] == spec['text'], 'Literal Unicode text mismatch'
    markers = [(m['text'], m['position'], m['key']) for m in record['markers']]
    assert markers == spec['markers'], ('Native markers differ', markers)
    assert all(m['href'] == '#' and m['requestType'] == 0 for m in record['markers'])
    plain16 = spec['text'].encode('utf-16-le')
    covered = set()
    for f in record['fragments']:
        length = len(f['text'].encode('utf-16-le')) // 2
        assert plain16[2*f['position']:2*(f['position']+length)].decode('utf-16-le') == f['text']
        for i in range(f['position'], f['position'] + length):
            assert i not in covered
            covered.add(i)
            lo, hi, fg, bg, italic = spec['emphasis']
            special = lo <= i < hi
            assert f['foreground'] == (fg if special else spec['base']), ('Foreground', i, f)
            assert f['background'] == (bg if special else ''), ('Highlight', i, f)
            assert f['weight'] == (700 if special else spec['weight']), ('Weight', i, f)
            assert f['italic'] == (italic if special else spec['italic']), ('Italic', i, f)
    assert covered == {i for i in range(len(plain16)//2) if plain16[2*i:2*i+2] != b'\n\0'}
    for query in record['keySearch']:
        assert query['key65'] == spec['markers'][0][1] and query['key66'] == -1

reports = []
version = (ART / 'official-version.txt').read_text()
assert re.search(r'\b2\.0\.2\b', version), 'Official binary did not report pinned version'
for label, expected in EXPECTED.items():
    for phase in ['author', 'loaded', 'reloaded']:
        filename = f'{label}.html.author.json' if phase == 'author' else f'{label}-{phase}.json'
        check(json.loads((ART / filename).read_text()), expected)
        reports.append({'script': label, 'phase': phase, 'literalTextStyleAndMarkers': 'PASS'})
    html = (ART / f'{label}.html').read_text()
    assert 'qrichtext' in html and 'key_65' in html
body_a = re.search(r'<body[^>]*>', (ART/'a.html').read_text()).group()
body_b = re.search(r'<body[^>]*>', (ART/'b.html').read_text()).group()
assert body_a != body_b, 'Fixture must exercise distinct native body defaults'
report = {'status': 'PASS', 'scope': 'Compatibility probe only; joined output and fault controls are not yet tested',
          'officialBinaryVersionOutput': version,
          'checks': reports, 'distinctNativeBodyDefaults': [body_a, body_b],
          'nativeLengthRoleNotUsed': 'Upstream LengthRole returns position; oracle uses text and UTF-16 positions'}
(ART / 'probe-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print('PASS native fixture author/save/load/fresh-reload; merger feasibility remains pending')
