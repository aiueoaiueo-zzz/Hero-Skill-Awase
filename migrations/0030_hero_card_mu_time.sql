-- 無発動カードの発生（card_mu_time。秒）を追加し、「やぎシミュ」（チームやぎシミュ、https://yagitools.cloudfree.jp/compas-deck/）の
-- キャラデータ（character.json の sskill：カード発動関連の「無」の発生）から入れる（docs/DECISIONS.md BE）。
-- HS合わせの判定で、相手の HS の無敵時間に、相手の無発動カードの発生を足して比べる。
-- slug が違っていても正式名称が同じなら入れる（管理画面で入力済みの値は上書きしない）。
ALTER TABLE heroes ADD COLUMN card_mu_time REAL CHECK (card_mu_time IS NULL OR (card_mu_time >= 0 AND card_mu_time <= 10));

-- hero-1 アタリ（十文字アタリ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-1' OR full_name = '十文字アタリ') AND card_mu_time IS NULL;
-- hero-2 ジャスティス（ジャスティス ハンコック）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-2' OR full_name = 'ジャスティス ハンコック') AND card_mu_time IS NULL;
-- hero-3 リリカ（リリカ）無発動カード 発生:0.44秒
UPDATE heroes SET card_mu_time = 0.44 WHERE (slug = 'hero-3' OR full_name = 'リリカ') AND card_mu_time IS NULL;
-- hero-4 乃保（双挽乃保）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-4' OR full_name = '双挽乃保') AND card_mu_time IS NULL;
-- hero-5 忠臣（桜華忠臣）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-5' OR full_name = '桜華忠臣') AND card_mu_time IS NULL;
-- hero-6 ジャンヌ（ジャンヌ ダルク）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-6' OR full_name = 'ジャンヌ ダルク') AND card_mu_time IS NULL;
-- hero-7 マルコス（マルコス'55）無発動カード 発生:0.36秒
UPDATE heroes SET card_mu_time = 0.36 WHERE (slug = 'hero-7' OR full_name = 'マルコス''55') AND card_mu_time IS NULL;
-- hero-8 ルチアーノ（ルチアーノ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-8' OR full_name = 'ルチアーノ') AND card_mu_time IS NULL;
-- hero-9 Voidoll（Voidoll）無発動カード 発生:0.35秒
UPDATE heroes SET card_mu_time = 0.35 WHERE (slug = 'hero-9' OR full_name = 'Voidoll') AND card_mu_time IS NULL;
-- hero-10 まとい（深川まとい）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-10' OR full_name = '深川まとい') AND card_mu_time IS NULL;
-- hero-11 ソル（ソル=バッドガイ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-11' OR full_name = 'ソル=バッドガイ') AND card_mu_time IS NULL;
-- hero-12 ディズィー（ディズィー）無発動カード 発生:0.58秒
UPDATE heroes SET card_mu_time = 0.58 WHERE (slug = 'hero-12' OR full_name = 'ディズィー') AND card_mu_time IS NULL;
-- hero-13 グスタフ（グスタフ ハイドリヒ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-13' OR full_name = 'グスタフ ハイドリヒ') AND card_mu_time IS NULL;
-- hero-14 テスラ（ニコラ テスラ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-14' OR full_name = 'ニコラ テスラ') AND card_mu_time IS NULL;
-- hero-15 ミク（初音 ミク）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-15' OR full_name = '初音 ミク') AND card_mu_time IS NULL;
-- hero-16 ヴィオレッタ（ヴィオレッタ ノワール）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-16' OR full_name = 'ヴィオレッタ ノワール') AND card_mu_time IS NULL;
-- hero-17 コクリコ（コクリコット ブランシュ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-17' OR full_name = 'コクリコット ブランシュ') AND card_mu_time IS NULL;
-- hero-18 リュウ（リュウ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-18' OR full_name = 'リュウ') AND card_mu_time IS NULL;
-- hero-19 春麗（春麗）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-19' OR full_name = '春麗') AND card_mu_time IS NULL;
-- hero-20 マリア（マリア=S=レオンブルク）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-20' OR full_name = 'マリア=S=レオンブルク') AND card_mu_time IS NULL;
-- hero-21 アダム（アダム=ユーリエフ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-21' OR full_name = 'アダム=ユーリエフ') AND card_mu_time IS NULL;
-- hero-22 13（サーティーン）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-22' OR full_name = 'サーティーン') AND card_mu_time IS NULL;
-- hero-23 勇者（かけだし勇者）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-23' OR full_name = 'かけだし勇者') AND card_mu_time IS NULL;
-- hero-24 エミリア（エミリア）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-24' OR full_name = 'エミリア') AND card_mu_time IS NULL;
-- hero-25 レム（レム）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-25' OR full_name = 'レム') AND card_mu_time IS NULL;
-- hero-26 カイ（カイ=キスク）無発動カード 発生:0.58秒
UPDATE heroes SET card_mu_time = 0.58 WHERE (slug = 'hero-26' OR full_name = 'カイ=キスク') AND card_mu_time IS NULL;
-- hero-27 メグメグ（メグメグ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-27' OR full_name = 'メグメグ') AND card_mu_time IS NULL;
-- hero-28 リン（鏡音 リン）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-28' OR full_name = '鏡音 リン') AND card_mu_time IS NULL;
-- hero-29 レン（鏡音 レン）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-29' OR full_name = '鏡音 レン') AND card_mu_time IS NULL;
-- hero-30 イスタカ（イスタカ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-30' OR full_name = 'イスタカ') AND card_mu_time IS NULL;
-- hero-31 ザクレイ（ザック&レイチェル）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-31' OR full_name = 'ザック&レイチェル') AND card_mu_time IS NULL;
-- hero-32 きらら（輝龍院きらら）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-32' OR full_name = '輝龍院きらら') AND card_mu_time IS NULL;
-- hero-33 モノクマ（モノクマ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-33' OR full_name = 'モノクマ') AND card_mu_time IS NULL;
-- hero-34 ポロロッチョ（ポロロッチョ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-34' OR full_name = 'ポロロッチョ') AND card_mu_time IS NULL;
-- hero-35 アクア（アクア）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-35' OR full_name = 'アクア') AND card_mu_time IS NULL;
-- hero-36 めぐみん（めぐみん）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-36' OR full_name = 'めぐみん') AND card_mu_time IS NULL;
-- hero-37 ソーン（ソーン=ユーリエフ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-37' OR full_name = 'ソーン=ユーリエフ') AND card_mu_time IS NULL;
-- hero-38 リヴァイ（リヴァイ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-38' OR full_name = 'リヴァイ') AND card_mu_time IS NULL;
-- hero-39 デルミン（デビルミント鬼龍 デルミン）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-39' OR full_name = 'デビルミント鬼龍 デルミン') AND card_mu_time IS NULL;
-- hero-40 トマス（トマス）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-40' OR full_name = 'トマス') AND card_mu_time IS NULL;
-- hero-41 猫宮（猫宮ひなた）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-41' OR full_name = '猫宮ひなた') AND card_mu_time IS NULL;
-- hero-42 岡部（岡部 倫太郎）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-42' OR full_name = '岡部 倫太郎') AND card_mu_time IS NULL;
-- hero-43 零夜（零夜）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-43' OR full_name = '零夜') AND card_mu_time IS NULL;
-- hero-44 オルタ（セイバーオルタ）無発動カード 発生:0.58秒
UPDATE heroes SET card_mu_time = 0.58 WHERE (slug = 'hero-44' OR full_name = 'セイバーオルタ') AND card_mu_time IS NULL;
-- hero-45 ギルガメッシュ（ギルガメッシュ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-45' OR full_name = 'ギルガメッシュ') AND card_mu_time IS NULL;
-- hero-46 ルルカ（ルルカ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-46' OR full_name = 'ルルカ') AND card_mu_time IS NULL;
-- hero-47 ピエール（ピエール77世）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-47' OR full_name = 'ピエール77世') AND card_mu_time IS NULL;
-- hero-48 忠信（佐藤四郎兵衛忠信）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-48' OR full_name = '佐藤四郎兵衛忠信') AND card_mu_time IS NULL;
-- hero-49 アイズ（アイズ・ヴァレンシュタイン）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-49' OR full_name = 'アイズ・ヴァレンシュタイン') AND card_mu_time IS NULL;
-- hero-50 甘色（狐ヶ咲 甘色）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-50' OR full_name = '狐ヶ咲 甘色') AND card_mu_time IS NULL;
-- hero-51 ノクティス（ノクティス）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-51' OR full_name = 'ノクティス') AND card_mu_time IS NULL;
-- hero-52 ニーズヘッグ（ニーズヘッグ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-52' OR full_name = 'ニーズヘッグ') AND card_mu_time IS NULL;
-- hero-53 敦（中島 敦）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-53' OR full_name = '中島 敦') AND card_mu_time IS NULL;
-- hero-54 芥川（芥川 龍之介）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-54' OR full_name = '芥川 龍之介') AND card_mu_time IS NULL;
-- hero-55 GBG（ゲームバズーカガール）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-55' OR full_name = 'ゲームバズーカガール') AND card_mu_time IS NULL;
-- hero-56 ライザ（ライザリン・シュタウト）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-56' OR full_name = 'ライザリン・シュタウト') AND card_mu_time IS NULL;
-- hero-57 アリス（青春 アリス）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-57' OR full_name = '青春 アリス') AND card_mu_time IS NULL;
-- hero-58 ジョーカー（ジョーカー）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-58' OR full_name = 'ジョーカー') AND card_mu_time IS NULL;
-- hero-59 イグニス（イグニス=ウィル=ウィスプ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-59' OR full_name = 'イグニス=ウィル=ウィスプ') AND card_mu_time IS NULL;
-- hero-60 アインズ（アインズ・ウール・ゴウン）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-60' OR full_name = 'アインズ・ウール・ゴウン') AND card_mu_time IS NULL;
-- hero-61 輪廻（糸廻 輪廻）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-61' OR full_name = '糸廻 輪廻') AND card_mu_time IS NULL;
-- hero-62 キリト（キリト）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-62' OR full_name = 'キリト') AND card_mu_time IS NULL;
-- hero-63 アスナ（アスナ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-63' OR full_name = 'アスナ') AND card_mu_time IS NULL;
-- hero-64 Bugdoll（Bugdoll）無発動カード 発生:0.36秒
UPDATE heroes SET card_mu_time = 0.36 WHERE (slug = 'hero-64' OR full_name = 'Bugdoll') AND card_mu_time IS NULL;
-- hero-65 ステリア（ステリア・ララ・シルワ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-65' OR full_name = 'ステリア・ララ・シルワ') AND card_mu_time IS NULL;
-- hero-66 ラム（ラム）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-66' OR full_name = 'ラム') AND card_mu_time IS NULL;
-- hero-67 2B（2B）無発動カード 発生:0.57秒
UPDATE heroes SET card_mu_time = 0.57 WHERE (slug = 'hero-67' OR full_name = '2B') AND card_mu_time IS NULL;
-- hero-68 ラヴィ（ラヴィ・シュシュマルシュ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-68' OR full_name = 'ラヴィ・シュシュマルシュ') AND card_mu_time IS NULL;
-- hero-69 リムル（リムル=テンペスト）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-69' OR full_name = 'リムル=テンペスト') AND card_mu_time IS NULL;
-- hero-70 アル（アル・ダハブ＝アルカティア）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-70' OR full_name = 'アル・ダハブ＝アルカティア') AND card_mu_time IS NULL;
-- hero-71 御坂（御坂美琴）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-71' OR full_name = '御坂美琴') AND card_mu_time IS NULL;
-- hero-72 アクセラ（アクセラレータ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-72' OR full_name = 'アクセラレータ') AND card_mu_time IS NULL;
-- hero-73 ぶれどら（ぶれいずどらごん）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-73' OR full_name = 'ぶれいずどらごん') AND card_mu_time IS NULL;
-- hero-74 ベル（ベル・クラネル）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-74' OR full_name = 'ベル・クラネル') AND card_mu_time IS NULL;
-- hero-75 ロキシー（ロキシー・ミグルディア）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-75' OR full_name = 'ロキシー・ミグルディア') AND card_mu_time IS NULL;
-- hero-76 某（某＜なにがし＞）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-76' OR full_name = '某＜なにがし＞') AND card_mu_time IS NULL;
-- hero-77 ロックマン（ロックマン.EXE&光熱斗）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-77' OR full_name = 'ロックマン.EXE&光熱斗') AND card_mu_time IS NULL;
-- hero-78 クーシー（クー・シー）無発動カード 発生:0.37秒
UPDATE heroes SET card_mu_time = 0.37 WHERE (slug = 'hero-78' OR full_name = 'クー・シー') AND card_mu_time IS NULL;
-- hero-79 デンジ（デンジ）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-79' OR full_name = 'デンジ') AND card_mu_time IS NULL;
-- hero-80 パワー（パワー）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-80' OR full_name = 'パワー') AND card_mu_time IS NULL;
-- hero-81 アミスター（アミスター=バランディン）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-81' OR full_name = 'アミスター=バランディン') AND card_mu_time IS NULL;
-- hero-82 シノン（シノン）無発動カード 発生:0.56秒
UPDATE heroes SET card_mu_time = 0.56 WHERE (slug = 'hero-82' OR full_name = 'シノン') AND card_mu_time IS NULL;
-- hero-83 ターニャ（ターニャ・デグレチャフ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-83' OR full_name = 'ターニャ・デグレチャフ') AND card_mu_time IS NULL;
-- hero-84 うら（鬼ヶ式 うら）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-84' OR full_name = '鬼ヶ式 うら') AND card_mu_time IS NULL;
-- hero-85 コラプス（コラプス）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-85' OR full_name = 'コラプス') AND card_mu_time IS NULL;
-- hero-86 ボンドルド（ボンドルド）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-86' OR full_name = 'ボンドルド') AND card_mu_time IS NULL;
-- hero-87 みりぽゆ（みりぽゆ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-87' OR full_name = 'みりぽゆ') AND card_mu_time IS NULL;
-- hero-88 ゴン（ゴン=フリークス）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-88' OR full_name = 'ゴン=フリークス') AND card_mu_time IS NULL;
-- hero-89 キルア（キルア=ゾルディック）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-89' OR full_name = 'キルア=ゾルディック') AND card_mu_time IS NULL;
-- hero-90 チーちゃん（チーちゃん）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-90' OR full_name = 'チーちゃん') AND card_mu_time IS NULL;
-- hero-91 上条（上条当麻）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-91' OR full_name = '上条当麻') AND card_mu_time IS NULL;
-- hero-92 ペルリニエ（ーペルリニエ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-92' OR full_name = 'ーペルリニエ') AND card_mu_time IS NULL;
-- hero-93 シャドウ（シャドウ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-93' OR full_name = 'シャドウ') AND card_mu_time IS NULL;
-- hero-94 ポプテピ（ポプ子&ピピ美）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-94' OR full_name = 'ポプ子&ピピ美') AND card_mu_time IS NULL;
-- hero-95 メルーニャ（メルーニャ・ランチェルナ）無発動カード 発生:0.45秒
UPDATE heroes SET card_mu_time = 0.45 WHERE (slug = 'hero-95' OR full_name = 'メルーニャ・ランチェルナ') AND card_mu_time IS NULL;
-- hero-96 セイバー（セイバー）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-96' OR full_name = 'セイバー') AND card_mu_time IS NULL;
-- hero-97 アーチャー（アーチャー）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-97' OR full_name = 'アーチャー') AND card_mu_time IS NULL;
-- hero-98 ランサー（ランサー）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-98' OR full_name = 'ランサー') AND card_mu_time IS NULL;
-- hero-99 ファースト（ファースト）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-99' OR full_name = 'ファースト') AND card_mu_time IS NULL;
-- hero-100 レゼ（レゼ）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-100' OR full_name = 'レゼ') AND card_mu_time IS NULL;
-- hero-101 シャルル（シャルル・リヒター）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-101' OR full_name = 'シャルル・リヒター') AND card_mu_time IS NULL;
-- hero-102 一姫（一姫）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-102' OR full_name = '一姫') AND card_mu_time IS NULL;
-- hero-103 エドワード（エドワード・エルリック）無発動カード 発生:0.54秒
UPDATE heroes SET card_mu_time = 0.54 WHERE (slug = 'hero-103' OR full_name = 'エドワード・エルリック') AND card_mu_time IS NULL;
-- hero-104 タココ（オクトバリ・ニャル・タココ）無発動カード 発生:0.55秒
UPDATE heroes SET card_mu_time = 0.55 WHERE (slug = 'hero-104' OR full_name = 'オクトバリ・ニャル・タココ') AND card_mu_time IS NULL;
