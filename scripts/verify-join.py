#!/usr/bin/env python3
"""Independent literal native text, formatting, cue and fault oracle."""
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT/'artifacts/native'
TEXT = 'Alpha café 🌟\nCue one\nLocal A\nEnd A\nBeta 東京\nCue two\nLocal B\nEnd B'
REVERSED = 'Beta 東京\nCue two\nLocal B\nEnd B\nAlpha café 🌟\nCue one\nLocal A\nEnd A'
BAD_TEXT = 'Alpha café 🌟\nCue one\nLocal A\nEnd A\nBeta 東京\nCue two\nLocal B\nBad B'
MARKERS = [('Cue one',14,65),('Local A',22,0),('Cue two',44,66),('Local B',52,0)]
REVERSE_MARKERS = [('Cue two',8,66),('Local B',16,0),('Cue one',44,65),('Local A',52,0)]

def check(record, mode):
    reverse = mode == 'reversed'
    text = REVERSED if reverse else BAD_TEXT if mode == 'wrong-text' else TEXT
    expected_markers = REVERSE_MARKERS if reverse else list(MARKERS)
    if mode == 'duplicate': expected_markers[2] = ('Cue two',44,65)
    if mode == 'cleared': expected_markers[2] = ('Cue two',44,0)
    assert record['realQmlEngine'] and record['documentClass'] == 'QQuickTextDocument'
    assert record['text'] == text, 'Literal Unicode text mismatch'
    assert [(m['text'],m['position'],m['key']) for m in record['markers']] == expected_markers, 'Literal marker set mismatch'
    assert all(m['href'] == '#' and m['requestType'] == 0 for m in record['markers'])
    raw = text.encode('utf-16-le');covered=set()
    for f in record['fragments']:
        length=len(f['text'].encode('utf-16-le'))//2
        assert raw[2*f['position']:2*(f['position']+length)].decode('utf-16-le') == f['text']
        for i in range(f['position'],f['position']+length):
            assert i not in covered;covered.add(i)
            a = i >= 30 if reverse else i < 35
            local = i-30 if reverse and a else i-36 if not reverse and not a else i
            special = 6 <= local < 10 if a else 5 <= local < 7
            family = 'DejaVu Sans' if a else 'DejaVu Serif'
            assert f['family'] == family and f['resolvedFamily'] == family, ('Family',i,f)
            fg = '#ff008800' if mode == 'wrong-color' and a and special else '#ffcc2244' if a and special else '#ff1266aa' if special else '#ff203040' if a else '#ff405060'
            assert f['foreground'] == fg, ('Foreground/alpha',i,f)
            on_cue = any(start <= i < start+len(label.encode('utf-16-le'))//2 for label,start,_ in expected_markers)
            bg = '#fffff080' if a and special else '#ffaaffcc' if special else '#00000000' if on_cue else ''
            assert f['background'] == bg, ('Highlight/alpha',i,f)
            assert f['underline'] == on_cue and f['overline'] == on_cue and f['strike'] is False, ('Decoration',i,f)
            assert f['weight'] == (700 if special else 400 if a else 600), ('Weight',i,f)
            assert f['italic'] == (a if special else not a), ('Italic',i,f)
    assert covered == {i for i in range(len(raw)//2) if raw[2*i:2*i+2] != b'\n\0'}
    target65 = 44 if reverse else 14
    target66 = -1 if mode in ['duplicate','cleared'] else 8 if reverse else 44
    assert [q['cursor'] for q in record['keySearch']] == [-1,0,15,1000]
    assert all(q['key65'] == target65 and q['key66'] == target66 for q in record['keySearch']), 'Native keySearch mismatch'

def sha(b): return hashlib.sha256(b).hexdigest()
rows=[]
for mode in ['joined','reversed','cleared','resaved-inputs','duplicate','wrong-color','wrong-text']:
    for phase in ['loaded','reloaded']:
        record=json.loads((ART/f'{mode}-{phase}.json').read_text());check(record,mode)
        row={'mode':mode,'phase':phase,'literalNativeTextStyleCuesAndKeySearch':'PASS'}
        if mode in ['duplicate','wrong-color','wrong-text']:
            rejected=False
            try: check(record,'joined')
            except AssertionError as error:
                reason=str(error);rejected=True
                expected='marker' if mode=='duplicate' else 'Foreground/alpha' if mode=='wrong-color' else 'Unicode text'
                assert expected.lower() in reason.lower(), ('Wrong negative failure',reason)
            assert rejected, 'Positive oracle accepted intentional fault'
            row['positiveOracleRejected']=True;row['rejectionReason']=reason
        rows.append(row)
joined=(ART/'joined.html').read_bytes()
assert (ART/'wrong-color.html').read_bytes()==joined.replace(b'#cc2244',b'#008800',1)
assert (ART/'wrong-text.html').read_bytes()==joined.replace(b'End B',b'Bad B',1)
hashes=[]
for name in ['a','b']:
    original=(ROOT/f'test/fixtures/{name}.html').read_bytes()
    assert (ART/f'{name}.html').read_bytes()==original
    hashes.append(sha(original))
for mode in ['joined','reversed','cleared','resaved-inputs','duplicate']:
    receipt=json.loads((ART/f'{mode}-receipt.json').read_text())
    expected_hashes=hashes
    if mode=='resaved-inputs':
        expected_hashes=[]
        for name in ['a','b']:
            raw=(ART/f'{name}-roundtrip.html').read_bytes()
            assert raw==(ROOT/f'test/fixtures/{name}-roundtrip.html').read_bytes()
            expected_hashes.append(sha(raw))
    assert receipt['inputHashes']==expected_hashes and receipt['outputSHA256']==sha((ART/f'{mode}.html').read_bytes())
    expected=REVERSE_MARKERS if mode=='reversed' else list(MARKERS)
    if mode=='cleared':expected[2]=('Cue two',44,0)
    if mode=='duplicate':expected[2]=('Cue two',44,65)
    assert [(c['text'],c['positionUTF16'],c['key']) for c in receipt['cues']]==expected
    assert receipt['order']==([1,0] if mode=='reversed' else [0,1])
    assert bool(receipt['retainedConflicts'])==(mode=='duplicate')
report={'status':'PASS','scope':'Source-only join prototype in unchanged official QPrompt components with real Qt Quick objects; browser output not tested',
        'checks':rows,'sourceFilesByteUnchanged':True,'negativeInputsAreExactSingleFaults':True,
        'duplicateControl':'Two key65 markers remain; native keySearch65 always returns the first at14 from all four tested cursor positions',
        'remappedControl':'Native keySearch65 returns14 and keySearch66 returns44, including fresh process after native save',
        'normalizationCaveat':'Native save may split anchors and remove residual href from non-anchor continuations; text/style/cue semantics, not whole snapshots, are asserted',
        'inputSHA256':hashes,'joinedSHA256':sha(joined)}
(ART/'join-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('PASS chosen order, remap/clear, native save/fresh reload and exact ambiguity/text/color controls')
