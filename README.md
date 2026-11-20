# Nihongo Duo 🦉

App học tiếng Nhật kiểu Duolingo — path bài học uốn lượn, tim (hearts), XP, streak, cửa hàng, bảng xếp hạng, bảng chữ cái.

## Chạy

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + build production
npm test           # vitest (unit + contract tests)
npm run ui:live    # test UI thật qua CDP (cần Chrome ở cổng 9222)
```

## Kiến trúc

```
src/
  types.ts            # domain contract (Word, Exercise, Lesson, Unit, ProgressState)
  store.tsx           # reducer + localStorage persistence + hooks
  App.tsx             # shell: topbar, routing, bottom nav
  lib/                # date, speech (TTS), sfx (Web Audio)
  styles/global.css   # design system dùng chung
  content/            # khoá học: vocab, kana, units/lessons/exercises
  features/
    path/             # trang chủ: đường đi bài học
    lesson/           # lesson player + exercise engine
    screens/          # hồ sơ, bảng xếp hạng, cửa hàng, bảng chữ cái
tests/                # vitest + harness CDP
```

## Ghi chú

- Tiến độ lưu ở `localStorage` key `nihongo-duo:progress:v1`.
- Không backend, không tài khoản — toàn bộ chạy client.
- TTS dùng Web Speech API (`ja-JP`), không có asset âm thanh.
