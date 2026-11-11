-- 全キャラのロールと HS の無敵時間を「やぎシミュ」（チームやぎシミュ、https://yagitools.cloudfree.jp/compas-deck/）の
-- キャラデータ（2026年10月27日アップデート版）から入れる（docs/DECISIONS.md AC。データの使用は作者の了承済み）。
-- すでに管理画面で入力済みの値は上書きしない（未入力のときだけ入れる）。
-- 無敵時間が複数ある HS（例：1.3秒/1.3秒/5.5秒）は、どれを使うか決めるまで入れない（コメントに元の値を残す）。

-- hero-1 アタリ（十文字アタリ）無敵:6秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-1' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-1' AND hs_invincible_time IS NULL;
-- hero-2 ジャスティス（ジャスティス ハンコック）無敵:7.34秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-2' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.34 WHERE slug = 'hero-2' AND hs_invincible_time IS NULL;
-- hero-3 リリカ（リリカ）無敵:6秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-3' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-3' AND hs_invincible_time IS NULL;
-- hero-4 乃保（双挽乃保）無敵:9秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-4' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 9 WHERE slug = 'hero-4' AND hs_invincible_time IS NULL;
-- hero-5 忠臣（桜華忠臣）無敵:7.3秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-5' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.3 WHERE slug = 'hero-5' AND hs_invincible_time IS NULL;
-- hero-6 ジャンヌ（ジャンヌ ダルク）無敵:7.3秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-6' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.3 WHERE slug = 'hero-6' AND hs_invincible_time IS NULL;
-- hero-7 マルコス（マルコス'55）無敵:1.3秒/1.3秒/5.5秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-7' AND role IS NULL;
-- hero-8 ルチアーノ（ルチアーノ）無敵:0.91秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-8' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 0.91 WHERE slug = 'hero-8' AND hs_invincible_time IS NULL;
-- hero-9 Voidoll（Voidoll）無敵:3.8秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-9' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 3.8 WHERE slug = 'hero-9' AND hs_invincible_time IS NULL;
-- hero-10 まとい（深川まとい）無敵:7.5秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-10' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.5 WHERE slug = 'hero-10' AND hs_invincible_time IS NULL;
-- hero-11 ソル（ソル=バッドガイ）無敵:5.3秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-11' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.3 WHERE slug = 'hero-11' AND hs_invincible_time IS NULL;
-- hero-12 ディズィー（ディズィー）無敵:8秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-12' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8 WHERE slug = 'hero-12' AND hs_invincible_time IS NULL;
-- hero-13 グスタフ（グスタフ ハイドリヒ）無敵:6.2秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-13' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.2 WHERE slug = 'hero-13' AND hs_invincible_time IS NULL;
-- hero-14 テスラ（ニコラ テスラ）無敵:1.5秒/5.5秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-14' AND role IS NULL;
-- hero-15 ミク（初音 ミク）無敵:7.3秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-15' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.3 WHERE slug = 'hero-15' AND hs_invincible_time IS NULL;
-- hero-16 ヴィオレッタ（ヴィオレッタ ノワール）無敵:7.3秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-16' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.3 WHERE slug = 'hero-16' AND hs_invincible_time IS NULL;
-- hero-17 コクリコ（コクリコット ブランシュ）無敵:6.7秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-17' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.7 WHERE slug = 'hero-17' AND hs_invincible_time IS NULL;
-- hero-18 リュウ（リュウ）無敵:3.5秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-18' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 3.5 WHERE slug = 'hero-18' AND hs_invincible_time IS NULL;
-- hero-19 春麗（春麗）無敵:4.3秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-19' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.3 WHERE slug = 'hero-19' AND hs_invincible_time IS NULL;
-- hero-20 マリア（マリア=S=レオンブルク）無敵:8.9秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-20' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.9 WHERE slug = 'hero-20' AND hs_invincible_time IS NULL;
-- hero-21 アダム（アダム=ユーリエフ）無敵:4.5秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-21' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.5 WHERE slug = 'hero-21' AND hs_invincible_time IS NULL;
-- hero-22 13（サーティーン）無敵:5.5秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-22' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.5 WHERE slug = 'hero-22' AND hs_invincible_time IS NULL;
-- hero-23 勇者（かけだし勇者）無敵:3.3秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-23' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 3.3 WHERE slug = 'hero-23' AND hs_invincible_time IS NULL;
-- hero-24 エミリア（エミリア）無敵:7.2秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-24' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.2 WHERE slug = 'hero-24' AND hs_invincible_time IS NULL;
-- hero-25 レム（レム）無敵:5.8秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-25' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.8 WHERE slug = 'hero-25' AND hs_invincible_time IS NULL;
-- hero-26 カイ（カイ=キスク）無敵:4.35秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-26' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.35 WHERE slug = 'hero-26' AND hs_invincible_time IS NULL;
-- hero-27 メグメグ（メグメグ）無敵:7秒/2.9秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-27' AND role IS NULL;
-- hero-28 リン（鏡音 リン）無敵:7.7秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-28' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.7 WHERE slug = 'hero-28' AND hs_invincible_time IS NULL;
-- hero-29 レン（鏡音 レン）無敵:7.1秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-29' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.1 WHERE slug = 'hero-29' AND hs_invincible_time IS NULL;
-- hero-30 イスタカ（イスタカ）無敵:4秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-30' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4 WHERE slug = 'hero-30' AND hs_invincible_time IS NULL;
-- hero-31 ザクレイ（ザック&レイチェル）無敵:5.3秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-31' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.3 WHERE slug = 'hero-31' AND hs_invincible_time IS NULL;
-- hero-32 きらら（輝龍院きらら）無敵:9秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-32' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 9 WHERE slug = 'hero-32' AND hs_invincible_time IS NULL;
-- hero-33 モノクマ（モノクマ）無敵:9.2秒/7秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-33' AND role IS NULL;
-- hero-34 ポロロッチョ（ポロロッチョ）無敵:7.8秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-34' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.8 WHERE slug = 'hero-34' AND hs_invincible_time IS NULL;
-- hero-35 アクア（アクア）無敵:6秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-35' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-35' AND hs_invincible_time IS NULL;
-- hero-36 めぐみん（めぐみん）無敵:9.5秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-36' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 9.5 WHERE slug = 'hero-36' AND hs_invincible_time IS NULL;
-- hero-37 ソーン（ソーン=ユーリエフ）無敵:7.9秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-37' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.9 WHERE slug = 'hero-37' AND hs_invincible_time IS NULL;
-- hero-38 リヴァイ（リヴァイ）無敵:4.7秒/7.6秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-38' AND role IS NULL;
-- hero-39 デルミン（デビルミント鬼龍 デルミン）無敵:7.1秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-39' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.1 WHERE slug = 'hero-39' AND hs_invincible_time IS NULL;
-- hero-40 トマス（トマス）無敵:6.7秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-40' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.7 WHERE slug = 'hero-40' AND hs_invincible_time IS NULL;
-- hero-41 猫宮（猫宮ひなた）無敵:7秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-41' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7 WHERE slug = 'hero-41' AND hs_invincible_time IS NULL;
-- hero-42 岡部（岡部 倫太郎）無敵:11秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-42' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 11 WHERE slug = 'hero-42' AND hs_invincible_time IS NULL;
-- hero-43 零夜（零夜）無敵:5秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-43' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5 WHERE slug = 'hero-43' AND hs_invincible_time IS NULL;
-- hero-44 オルタ（セイバーオルタ）無敵:8.2秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-44' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.2 WHERE slug = 'hero-44' AND hs_invincible_time IS NULL;
-- hero-45 ギルガメッシュ（ギルガメッシュ）無敵:10秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-45' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-45' AND hs_invincible_time IS NULL;
-- hero-46 ルルカ（ルルカ）無敵:6秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-46' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-46' AND hs_invincible_time IS NULL;
-- hero-47 ピエール（ピエール77世）無敵:6.88秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-47' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.88 WHERE slug = 'hero-47' AND hs_invincible_time IS NULL;
-- hero-48 忠信（佐藤四郎兵衛忠信）無敵:8.4秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-48' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.4 WHERE slug = 'hero-48' AND hs_invincible_time IS NULL;
-- hero-49 アイズ（アイズ・ヴァレンシュタイン）無敵:3.98秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-49' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 3.98 WHERE slug = 'hero-49' AND hs_invincible_time IS NULL;
-- hero-50 甘色（狐ヶ咲 甘色）無敵:6秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-50' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-50' AND hs_invincible_time IS NULL;
-- hero-51 ノクティス（ノクティス）無敵:7.2秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-51' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.2 WHERE slug = 'hero-51' AND hs_invincible_time IS NULL;
-- hero-52 ニーズヘッグ（ニーズヘッグ）無敵:11秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-52' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 11 WHERE slug = 'hero-52' AND hs_invincible_time IS NULL;
-- hero-53 敦（中島 敦）無敵:5.17秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-53' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.17 WHERE slug = 'hero-53' AND hs_invincible_time IS NULL;
-- hero-54 芥川（芥川 龍之介）無敵:5.73秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-54' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.73 WHERE slug = 'hero-54' AND hs_invincible_time IS NULL;
-- hero-55 GBG（ゲームバズーカガール）無敵:8.72秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-55' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.72 WHERE slug = 'hero-55' AND hs_invincible_time IS NULL;
-- hero-56 ライザ（ライザリン・シュタウト）無敵:8.07秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-56' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.07 WHERE slug = 'hero-56' AND hs_invincible_time IS NULL;
-- hero-57 アリス（青春 アリス）無敵:6.25秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-57' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.25 WHERE slug = 'hero-57' AND hs_invincible_time IS NULL;
-- hero-58 ジョーカー（ジョーカー）無敵:7.34秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-58' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.34 WHERE slug = 'hero-58' AND hs_invincible_time IS NULL;
-- hero-59 イグニス（イグニス=ウィル=ウィスプ）無敵:6.72秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-59' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.72 WHERE slug = 'hero-59' AND hs_invincible_time IS NULL;
-- hero-60 アインズ（アインズ・ウール・ゴウン）無敵:7.05秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-60' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.05 WHERE slug = 'hero-60' AND hs_invincible_time IS NULL;
-- hero-61 輪廻（糸廻 輪廻）無敵:8.55秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-61' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.55 WHERE slug = 'hero-61' AND hs_invincible_time IS NULL;
-- hero-62 キリト（キリト）無敵:6秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-62' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-62' AND hs_invincible_time IS NULL;
-- hero-63 アスナ（アスナ）無敵:4.35秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-63' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.35 WHERE slug = 'hero-63' AND hs_invincible_time IS NULL;
-- hero-64 Bugdoll（Bugdoll）無敵:10.05秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-64' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10.05 WHERE slug = 'hero-64' AND hs_invincible_time IS NULL;
-- hero-65 ステリア（ステリア・ララ・シルワ）無敵:4.8秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-65' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.8 WHERE slug = 'hero-65' AND hs_invincible_time IS NULL;
-- hero-66 ラム（ラム）無敵:7.07秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-66' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.07 WHERE slug = 'hero-66' AND hs_invincible_time IS NULL;
-- hero-67 2B（2B）無敵:6.3秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-67' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.3 WHERE slug = 'hero-67' AND hs_invincible_time IS NULL;
-- hero-68 ラヴィ（ラヴィ・シュシュマルシュ）無敵:6.6秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-68' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.6 WHERE slug = 'hero-68' AND hs_invincible_time IS NULL;
-- hero-69 リムル（リムル=テンペスト）無敵:5.8秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-69' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.8 WHERE slug = 'hero-69' AND hs_invincible_time IS NULL;
-- hero-70 アル（アル・ダハブ＝アルカティア）無敵:4.34秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-70' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.34 WHERE slug = 'hero-70' AND hs_invincible_time IS NULL;
-- hero-71 御坂（御坂美琴）無敵:6.35秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-71' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.35 WHERE slug = 'hero-71' AND hs_invincible_time IS NULL;
-- hero-72 アクセラ（アクセラレータ）無敵:6秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-72' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-72' AND hs_invincible_time IS NULL;
-- hero-73 ぶれどら（ぶれいずどらごん）無敵:10秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-73' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-73' AND hs_invincible_time IS NULL;
-- hero-74 ベル（ベル・クラネル）無敵:4.8秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-74' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.8 WHERE slug = 'hero-74' AND hs_invincible_time IS NULL;
-- hero-75 ロキシー（ロキシー・ミグルディア）無敵:8秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-75' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8 WHERE slug = 'hero-75' AND hs_invincible_time IS NULL;
-- hero-76 某（某＜なにがし＞）無敵:4秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-76' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4 WHERE slug = 'hero-76' AND hs_invincible_time IS NULL;
-- hero-77 ロックマン（ロックマン.EXE&光熱斗）無敵:4.56秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-77' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.56 WHERE slug = 'hero-77' AND hs_invincible_time IS NULL;
-- hero-78 クーシー（クー・シー）無敵:4.66秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-78' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4.66 WHERE slug = 'hero-78' AND hs_invincible_time IS NULL;
-- hero-79 デンジ（デンジ）無敵:8.16秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-79' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.16 WHERE slug = 'hero-79' AND hs_invincible_time IS NULL;
-- hero-80 パワー（パワー）無敵:7.9秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-80' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.9 WHERE slug = 'hero-80' AND hs_invincible_time IS NULL;
-- hero-81 アミスター（アミスター=バランディン）無敵:5.84秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-81' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.84 WHERE slug = 'hero-81' AND hs_invincible_time IS NULL;
-- hero-82 シノン（シノン）無敵:6秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-82' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6 WHERE slug = 'hero-82' AND hs_invincible_time IS NULL;
-- hero-83 ターニャ（ターニャ・デグレチャフ）無敵:8秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-83' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8 WHERE slug = 'hero-83' AND hs_invincible_time IS NULL;
-- hero-84 うら（鬼ヶ式 うら）無敵:8秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-84' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8 WHERE slug = 'hero-84' AND hs_invincible_time IS NULL;
-- hero-85 コラプス（コラプス）無敵:6.66秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-85' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.66 WHERE slug = 'hero-85' AND hs_invincible_time IS NULL;
-- hero-86 ボンドルド（ボンドルド）無敵:4秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-86' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 4 WHERE slug = 'hero-86' AND hs_invincible_time IS NULL;
-- hero-87 みりぽゆ（みりぽゆ）無敵:6秒/2秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-87' AND role IS NULL;
-- hero-88 ゴン（ゴン=フリークス）無敵:9秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-88' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 9 WHERE slug = 'hero-88' AND hs_invincible_time IS NULL;
-- hero-89 キルア（キルア=ゾルディック）無敵:5.3秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-89' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 5.3 WHERE slug = 'hero-89' AND hs_invincible_time IS NULL;
-- hero-90 チーちゃん（チーちゃん）無敵:10秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-90' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-90' AND hs_invincible_time IS NULL;
-- hero-91 上条（上条当麻）無敵:9.5秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-91' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 9.5 WHERE slug = 'hero-91' AND hs_invincible_time IS NULL;
-- hero-92 ペルリニエ（ーペルリニエ）無敵:7秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-92' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7 WHERE slug = 'hero-92' AND hs_invincible_time IS NULL;
-- hero-93 シャドウ（シャドウ）無敵:7.1秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-93' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.1 WHERE slug = 'hero-93' AND hs_invincible_time IS NULL;
-- hero-94 ポプテピ（ポプ子&ピピ美）無敵:9.7秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-94' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 9.7 WHERE slug = 'hero-94' AND hs_invincible_time IS NULL;
-- hero-95 メルーニャ（メルーニャ・ランチェルナ）無敵:1.3秒/8.9秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-95' AND role IS NULL;
-- hero-96 セイバー（セイバー）無敵:10秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-96' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-96' AND hs_invincible_time IS NULL;
-- hero-97 アーチャー（アーチャー）無敵:10秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-97' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-97' AND hs_invincible_time IS NULL;
-- hero-98 ランサー（ランサー）無敵:10秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-98' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-98' AND hs_invincible_time IS NULL;
-- hero-99 ファースト（ファースト）無敵:10秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-99' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 10 WHERE slug = 'hero-99' AND hs_invincible_time IS NULL;
-- hero-100 レゼ（レゼ）無敵:7.77秒
UPDATE heroes SET role = 'gunner' WHERE slug = 'hero-100' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7.77 WHERE slug = 'hero-100' AND hs_invincible_time IS NULL;
-- hero-101 シャルル（シャルル・リヒター）無敵:8秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-101' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8 WHERE slug = 'hero-101' AND hs_invincible_time IS NULL;
-- hero-102 一姫（一姫）無敵:8.9秒
UPDATE heroes SET role = 'sprinter' WHERE slug = 'hero-102' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 8.9 WHERE slug = 'hero-102' AND hs_invincible_time IS NULL;
-- hero-103 エドワード（エドワード・エルリック）無敵:7秒
UPDATE heroes SET role = 'tank' WHERE slug = 'hero-103' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 7 WHERE slug = 'hero-103' AND hs_invincible_time IS NULL;
-- hero-104 タココ（オクトバリ・ニャル・タココ）無敵:6.67秒
UPDATE heroes SET role = 'attacker' WHERE slug = 'hero-104' AND role IS NULL;
UPDATE heroes SET hs_invincible_time = 6.67 WHERE slug = 'hero-104' AND hs_invincible_time IS NULL;
