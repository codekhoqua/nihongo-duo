/**
 * Kana charts.
 * Hiragana: 46 basic + 20 dakuten/handakuten.
 * Katakana: 46 basic.
 */
import type { KanaChar, KanaScript } from '../types';

export const HIRAGANA: KanaChar[] = [
  /* ---------------------------------------------------------- hàng a */
  { id: 'hira-a', char: 'あ', romaji: 'a', row: 'a', example: 'あさ', exampleMeaning: 'Buổi sáng' },
  { id: 'hira-i', char: 'い', romaji: 'i', row: 'a', example: 'いえ', exampleMeaning: 'Nhà' },
  { id: 'hira-u', char: 'う', romaji: 'u', row: 'a', example: 'うみ', exampleMeaning: 'Biển' },
  { id: 'hira-e', char: 'え', romaji: 'e', row: 'a', example: 'えき', exampleMeaning: 'Ga tàu' },
  { id: 'hira-o', char: 'お', romaji: 'o', row: 'a', example: 'おちゃ', exampleMeaning: 'Trà' },

  /* --------------------------------------------------------- hàng ka */
  { id: 'hira-ka', char: 'か', romaji: 'ka', row: 'ka', example: 'かさ', exampleMeaning: 'Cái ô' },
  { id: 'hira-ki', char: 'き', romaji: 'ki', row: 'ka', example: 'き', exampleMeaning: 'Cây' },
  { id: 'hira-ku', char: 'く', romaji: 'ku', row: 'ka', example: 'くるま', exampleMeaning: 'Ô tô' },
  { id: 'hira-ke', char: 'け', romaji: 'ke', row: 'ka', example: 'けさ', exampleMeaning: 'Sáng nay' },
  { id: 'hira-ko', char: 'こ', romaji: 'ko', row: 'ka', example: 'ここ', exampleMeaning: 'Ở đây' },

  /* --------------------------------------------------------- hàng sa */
  { id: 'hira-sa', char: 'さ', romaji: 'sa', row: 'sa', example: 'さかな', exampleMeaning: 'Cá' },
  { id: 'hira-shi', char: 'し', romaji: 'shi', row: 'sa', example: 'しま', exampleMeaning: 'Hòn đảo' },
  { id: 'hira-su', char: 'す', romaji: 'su', row: 'sa', example: 'すし', exampleMeaning: 'Sushi' },
  { id: 'hira-se', char: 'せ', romaji: 'se', row: 'sa', example: 'せんせい', exampleMeaning: 'Giáo viên' },
  { id: 'hira-so', char: 'そ', romaji: 'so', row: 'sa', example: 'そら', exampleMeaning: 'Bầu trời' },

  /* --------------------------------------------------------- hàng ta */
  { id: 'hira-ta', char: 'た', romaji: 'ta', row: 'ta', example: 'たまご', exampleMeaning: 'Trứng' },
  { id: 'hira-chi', char: 'ち', romaji: 'chi', row: 'ta', example: 'ちいさい', exampleMeaning: 'Nhỏ' },
  { id: 'hira-tsu', char: 'つ', romaji: 'tsu', row: 'ta', example: 'つくえ', exampleMeaning: 'Bàn học' },
  { id: 'hira-te', char: 'て', romaji: 'te', row: 'ta', example: 'て', exampleMeaning: 'Bàn tay' },
  { id: 'hira-to', char: 'と', romaji: 'to', row: 'ta', example: 'とり', exampleMeaning: 'Con chim' },

  /* --------------------------------------------------------- hàng na */
  { id: 'hira-na', char: 'な', romaji: 'na', row: 'na', example: 'なな', exampleMeaning: 'Bảy' },
  { id: 'hira-ni', char: 'に', romaji: 'ni', row: 'na', example: 'にく', exampleMeaning: 'Thịt' },
  { id: 'hira-nu', char: 'ぬ', romaji: 'nu', row: 'na', example: 'いぬ', exampleMeaning: 'Con chó' },
  { id: 'hira-ne', char: 'ね', romaji: 'ne', row: 'na', example: 'ねこ', exampleMeaning: 'Con mèo' },
  { id: 'hira-no', char: 'の', romaji: 'no', row: 'na', example: 'のむ', exampleMeaning: 'Uống' },

  /* --------------------------------------------------------- hàng ha */
  { id: 'hira-ha', char: 'は', romaji: 'ha', row: 'ha', example: 'はな', exampleMeaning: 'Hoa' },
  { id: 'hira-hi', char: 'ひ', romaji: 'hi', row: 'ha', example: 'ひこうき', exampleMeaning: 'Máy bay' },
  { id: 'hira-fu', char: 'ふ', romaji: 'fu', row: 'ha', example: 'ふゆ', exampleMeaning: 'Mùa đông' },
  { id: 'hira-he', char: 'へ', romaji: 'he', row: 'ha', example: 'へや', exampleMeaning: 'Căn phòng' },
  { id: 'hira-ho', char: 'ほ', romaji: 'ho', row: 'ha', example: 'ほん', exampleMeaning: 'Sách' },

  /* --------------------------------------------------------- hàng ma */
  { id: 'hira-ma', char: 'ま', romaji: 'ma', row: 'ma', example: 'まち', exampleMeaning: 'Thành phố' },
  { id: 'hira-mi', char: 'み', romaji: 'mi', row: 'ma', example: 'みず', exampleMeaning: 'Nước' },
  { id: 'hira-mu', char: 'む', romaji: 'mu', row: 'ma', example: 'むずかしい', exampleMeaning: 'Khó' },
  { id: 'hira-me', char: 'め', romaji: 'me', row: 'ma', example: 'め', exampleMeaning: 'Mắt' },
  { id: 'hira-mo', char: 'も', romaji: 'mo', row: 'ma', example: 'もり', exampleMeaning: 'Rừng' },

  /* --------------------------------------------------------- hàng ya */
  { id: 'hira-ya', char: 'や', romaji: 'ya', row: 'ya', example: 'やま', exampleMeaning: 'Núi' },
  { id: 'hira-yu', char: 'ゆ', romaji: 'yu', row: 'ya', example: 'ゆき', exampleMeaning: 'Tuyết' },
  { id: 'hira-yo', char: 'よ', romaji: 'yo', row: 'ya', example: 'よる', exampleMeaning: 'Buổi tối' },

  /* --------------------------------------------------------- hàng ra */
  { id: 'hira-ra', char: 'ら', romaji: 'ra', row: 'ra', example: 'さくら', exampleMeaning: 'Hoa anh đào' },
  { id: 'hira-ri', char: 'り', romaji: 'ri', row: 'ra', example: 'りんご', exampleMeaning: 'Quả táo' },
  { id: 'hira-ru', char: 'る', romaji: 'ru', row: 'ra', example: 'あるく', exampleMeaning: 'Đi bộ' },
  { id: 'hira-re', char: 'れ', romaji: 're', row: 'ra', example: 'れんしゅう', exampleMeaning: 'Luyện tập' },
  { id: 'hira-ro', char: 'ろ', romaji: 'ro', row: 'ra', example: 'ろく', exampleMeaning: 'Sáu' },

  /* --------------------------------------------------------- hàng wa */
  { id: 'hira-wa', char: 'わ', romaji: 'wa', row: 'wa', example: 'わたし', exampleMeaning: 'Tôi' },
  { id: 'hira-wo', char: 'を', romaji: 'wo', row: 'wa', example: 'ほんをよむ', exampleMeaning: 'Đọc sách' },

  /* ------------------------------------------------------------ hàng n */
  { id: 'hira-n', char: 'ん', romaji: 'n', row: 'n', example: 'みかん', exampleMeaning: 'Quả quýt' },

  /* ----------------------------------------------------- dakuten: ga */
  { id: 'hira-ga', char: 'が', romaji: 'ga', row: 'ga', example: 'がっこう', exampleMeaning: 'Trường học' },
  { id: 'hira-gi', char: 'ぎ', romaji: 'gi', row: 'ga', example: 'ぎんこう', exampleMeaning: 'Ngân hàng' },
  { id: 'hira-gu', char: 'ぐ', romaji: 'gu', row: 'ga' },
  { id: 'hira-ge', char: 'げ', romaji: 'ge', row: 'ga', example: 'げんき', exampleMeaning: 'Khoẻ' },
  { id: 'hira-go', char: 'ご', romaji: 'go', row: 'ga', example: 'ごはん', exampleMeaning: 'Cơm' },

  /* ----------------------------------------------------- dakuten: za */
  { id: 'hira-za', char: 'ざ', romaji: 'za', row: 'za', example: 'ざっし', exampleMeaning: 'Tạp chí' },
  { id: 'hira-ji', char: 'じ', romaji: 'ji', row: 'za', example: 'じかん', exampleMeaning: 'Thời gian' },
  { id: 'hira-zu', char: 'ず', romaji: 'zu', row: 'za', example: 'みず', exampleMeaning: 'Nước' },
  { id: 'hira-ze', char: 'ぜ', romaji: 'ze', row: 'za' },
  { id: 'hira-zo', char: 'ぞ', romaji: 'zo', row: 'za' },

  /* ----------------------------------------------------- dakuten: da */
  { id: 'hira-da', char: 'だ', romaji: 'da', row: 'da', example: 'だいがく', exampleMeaning: 'Đại học' },
  { id: 'hira-de', char: 'で', romaji: 'de', row: 'da', example: 'でんしゃ', exampleMeaning: 'Tàu điện' },
  { id: 'hira-do', char: 'ど', romaji: 'do', row: 'da', example: 'どこ', exampleMeaning: 'Ở đâu' },

  /* ----------------------------------------------------- dakuten: ba */
  { id: 'hira-ba', char: 'ば', romaji: 'ba', row: 'ba', example: 'ばしょ', exampleMeaning: 'Địa điểm' },
  { id: 'hira-bi', char: 'び', romaji: 'bi', row: 'ba', example: 'びょういん', exampleMeaning: 'Bệnh viện' },
  { id: 'hira-bu', char: 'ぶ', romaji: 'bu', row: 'ba' },
  { id: 'hira-be', char: 'べ', romaji: 'be', row: 'ba', example: 'べんきょう', exampleMeaning: 'Học bài' },
  { id: 'hira-bo', char: 'ぼ', romaji: 'bo', row: 'ba', example: 'ぼうし', exampleMeaning: 'Cái mũ' },

  /* ------------------------------------------------ handakuten: pa */
  { id: 'hira-pa', char: 'ぱ', romaji: 'pa', row: 'pa', example: 'ぱん', exampleMeaning: 'Bánh mì' },
  { id: 'hira-po', char: 'ぽ', romaji: 'po', row: 'pa', example: 'さんぽ', exampleMeaning: 'Đi dạo' },
];

export const KATAKANA: KanaChar[] = [
  /* ---------------------------------------------------------- hàng a */
  { id: 'kata-a', char: 'ア', romaji: 'a', row: 'a', example: 'アメリカ', exampleMeaning: 'Nước Mỹ' },
  { id: 'kata-i', char: 'イ', romaji: 'i', row: 'a', example: 'インド', exampleMeaning: 'Ấn Độ' },
  { id: 'kata-u', char: 'ウ', romaji: 'u', row: 'a', example: 'ウイスキー', exampleMeaning: 'Rượu whisky' },
  { id: 'kata-e', char: 'エ', romaji: 'e', row: 'a', example: 'エレベーター', exampleMeaning: 'Thang máy' },
  { id: 'kata-o', char: 'オ', romaji: 'o', row: 'a', example: 'オレンジ', exampleMeaning: 'Quả cam' },

  /* --------------------------------------------------------- hàng ka */
  { id: 'kata-ka', char: 'カ', romaji: 'ka', row: 'ka', example: 'カメラ', exampleMeaning: 'Máy ảnh' },
  { id: 'kata-ki', char: 'キ', romaji: 'ki', row: 'ka', example: 'キッチン', exampleMeaning: 'Nhà bếp' },
  { id: 'kata-ku', char: 'ク', romaji: 'ku', row: 'ka', example: 'クラス', exampleMeaning: 'Lớp học' },
  { id: 'kata-ke', char: 'ケ', romaji: 'ke', row: 'ka', example: 'ケーキ', exampleMeaning: 'Bánh ngọt' },
  { id: 'kata-ko', char: 'コ', romaji: 'ko', row: 'ka', example: 'コーヒー', exampleMeaning: 'Cà phê' },

  /* --------------------------------------------------------- hàng sa */
  { id: 'kata-sa', char: 'サ', romaji: 'sa', row: 'sa', example: 'サッカー', exampleMeaning: 'Bóng đá' },
  { id: 'kata-shi', char: 'シ', romaji: 'shi', row: 'sa', example: 'シャツ', exampleMeaning: 'Áo sơ mi' },
  { id: 'kata-su', char: 'ス', romaji: 'su', row: 'sa', example: 'スープ', exampleMeaning: 'Súp' },
  { id: 'kata-se', char: 'セ', romaji: 'se', row: 'sa', example: 'セーター', exampleMeaning: 'Áo len' },
  { id: 'kata-so', char: 'ソ', romaji: 'so', row: 'sa', example: 'ソファ', exampleMeaning: 'Ghế sofa' },

  /* --------------------------------------------------------- hàng ta */
  { id: 'kata-ta', char: 'タ', romaji: 'ta', row: 'ta', example: 'タクシー', exampleMeaning: 'Taxi' },
  { id: 'kata-chi', char: 'チ', romaji: 'chi', row: 'ta', example: 'チーズ', exampleMeaning: 'Phô mai' },
  { id: 'kata-tsu', char: 'ツ', romaji: 'tsu', row: 'ta', example: 'ツアー', exampleMeaning: 'Tour du lịch' },
  { id: 'kata-te', char: 'テ', romaji: 'te', row: 'ta', example: 'テレビ', exampleMeaning: 'Tivi' },
  { id: 'kata-to', char: 'ト', romaji: 'to', row: 'ta', example: 'トイレ', exampleMeaning: 'Nhà vệ sinh' },

  /* --------------------------------------------------------- hàng na */
  { id: 'kata-na', char: 'ナ', romaji: 'na', row: 'na', example: 'ナイフ', exampleMeaning: 'Con dao' },
  { id: 'kata-ni', char: 'ニ', romaji: 'ni', row: 'na', example: 'ニュース', exampleMeaning: 'Tin tức' },
  { id: 'kata-nu', char: 'ヌ', romaji: 'nu', row: 'na', example: 'ヌードル', exampleMeaning: 'Mì' },
  { id: 'kata-ne', char: 'ネ', romaji: 'ne', row: 'na', example: 'ネクタイ', exampleMeaning: 'Cà vạt' },
  { id: 'kata-no', char: 'ノ', romaji: 'no', row: 'na', example: 'ノート', exampleMeaning: 'Vở' },

  /* --------------------------------------------------------- hàng ha */
  { id: 'kata-ha', char: 'ハ', romaji: 'ha', row: 'ha', example: 'ハンバーガー', exampleMeaning: 'Hamburger' },
  { id: 'kata-hi', char: 'ヒ', romaji: 'hi', row: 'ha', example: 'ヒーター', exampleMeaning: 'Máy sưởi' },
  { id: 'kata-fu', char: 'フ', romaji: 'fu', row: 'ha', example: 'フランス', exampleMeaning: 'Nước Pháp' },
  { id: 'kata-he', char: 'ヘ', romaji: 'he', row: 'ha', example: 'ヘリ', exampleMeaning: 'Trực thăng' },
  { id: 'kata-ho', char: 'ホ', romaji: 'ho', row: 'ha', example: 'ホテル', exampleMeaning: 'Khách sạn' },

  /* --------------------------------------------------------- hàng ma */
  { id: 'kata-ma', char: 'マ', romaji: 'ma', row: 'ma', example: 'マンション', exampleMeaning: 'Chung cư' },
  { id: 'kata-mi', char: 'ミ', romaji: 'mi', row: 'ma', example: 'ミルク', exampleMeaning: 'Sữa' },
  { id: 'kata-mu', char: 'ム', romaji: 'mu', row: 'ma', example: 'ムービー', exampleMeaning: 'Phim' },
  { id: 'kata-me', char: 'メ', romaji: 'me', row: 'ma', example: 'メニュー', exampleMeaning: 'Thực đơn' },
  { id: 'kata-mo', char: 'モ', romaji: 'mo', row: 'ma', example: 'モール', exampleMeaning: 'Trung tâm mua sắm' },

  /* --------------------------------------------------------- hàng ya */
  { id: 'kata-ya', char: 'ヤ', romaji: 'ya', row: 'ya' },
  { id: 'kata-yu', char: 'ユ', romaji: 'yu', row: 'ya', example: 'ユーモア', exampleMeaning: 'Sự hài hước' },
  { id: 'kata-yo', char: 'ヨ', romaji: 'yo', row: 'ya', example: 'ヨーグルト', exampleMeaning: 'Sữa chua' },

  /* --------------------------------------------------------- hàng ra */
  { id: 'kata-ra', char: 'ラ', romaji: 'ra', row: 'ra', example: 'ラーメン', exampleMeaning: 'Mì ramen' },
  { id: 'kata-ri', char: 'リ', romaji: 'ri', row: 'ra', example: 'リンゴ', exampleMeaning: 'Quả táo' },
  { id: 'kata-ru', char: 'ル', romaji: 'ru', row: 'ra', example: 'ルール', exampleMeaning: 'Quy tắc' },
  { id: 'kata-re', char: 'レ', romaji: 're', row: 'ra', example: 'レストラン', exampleMeaning: 'Nhà hàng' },
  { id: 'kata-ro', char: 'ロ', romaji: 'ro', row: 'ra', example: 'ロボット', exampleMeaning: 'Robot' },

  /* --------------------------------------------------------- hàng wa */
  { id: 'kata-wa', char: 'ワ', romaji: 'wa', row: 'wa', example: 'ワイン', exampleMeaning: 'Rượu vang' },
  { id: 'kata-wo', char: 'ヲ', romaji: 'wo', row: 'wa' },

  /* ------------------------------------------------------------ hàng n */
  { id: 'kata-n', char: 'ン', romaji: 'n', row: 'n', example: 'パン', exampleMeaning: 'Bánh mì' },
];

/** Row order used by the alphabet screen. */
export const KANA_ROWS: Record<KanaScript, string[]> = {
  hiragana: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n', 'ga', 'za', 'da', 'ba', 'pa'],
  katakana: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n'],
};
