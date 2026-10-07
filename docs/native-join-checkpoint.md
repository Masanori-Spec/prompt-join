# Accepted source/API joining checkpoint

The source-only joiner passed the official-component gate at
`ad70d7772237ab886974ece6f781595e01db171e` in
[run 37550877879](https://github.com/Masanori-Spec/prompt-join/actions/runs/37550877879).
Artifact 11452023687 has SHA-256
`c8a3b2086e6ad9ec4829adc226d52fe554611918355f9cfcd8ab917b36c056d0`.
All 69 members and the actual native observations were independently reviewed.

Thirty core tests passed. Fourteen actual native load/fresh-reload records cover
joined and reversed order, remapped and cleared shortcuts, input that has already
been native-saved, retained duplicate keys and exact text/color faults. Literal
Unicode text, UTF-16 offsets, declared/resolved families, weight, italic, RGBA,
highlights, decorations and cue text/keys passed. Original input bytes and receipt
hashes matched. Joined HTML SHA-256:
`c9587c329522aec6a423e76f311eaddf3056695e366c596e28f964a9c6b417e4`.

With distinct shortcuts, native `keySearch(65)` selects position 14 and
`keySearch(66)` selects 44. Retaining both original key65 cues makes key65 select
only the first at 14, from each tested cursor position. The duplicate case and
the exact wrong-text/wrong-color cases matched their intended faults and failed
the unchanged positive oracle, both before and after native save/fresh reload.

This establishes the bounded source/API implementation, with real QML-created
objects and unchanged upstream consumer files. It is not desktop GUI-driving or
browser-download acceptance. A UI must send its actual downloaded HTML through
the same independent native checks before release. Native save may normalize
anchor structure and remove residual href from non-anchor cue continuations;
whole HTML/snapshot identity and exact font-size/layout are not claimed.
