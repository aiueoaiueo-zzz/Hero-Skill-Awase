-- HS のダメージ発生（hs_attack_time）を「やぎシミュ」（チームやぎシミュ）のキャラデータ（2026年10月27日版）の
-- HS の説明の「発生:◯秒」から入れる（docs/DECISIONS.md AE）。
-- ヒーロースキルが「可」のキャラだけ（ng_attacks に hs がない）、かつ未入力のときだけ入れる（入力済みの値は上書きしない）。

-- hero-1 アタリ（十文字アタリ）発生:5.5秒 対象:自身 体力全回復 周囲にドットモンスターを展開[攻撃補正:240%(2.4倍)
UPDATE heroes SET hs_attack_time = 5.5 WHERE slug = 'hero-1' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-2 ジャスティス（ジャスティス ハンコック）発生:6.6秒 対象:全ポータル 攻撃補正:600%(6倍) 攻撃範囲:周囲半径5.5ﾏｽ 攻撃間隔
UPDATE heroes SET hs_attack_time = 6.6 WHERE slug = 'hero-2' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-3 リリカ（リリカ）発生:4.5秒 対象:味方全員 継続時間:15秒 自身の攻撃力と防御力を200%(2倍)、味方の攻撃
UPDATE heroes SET hs_attack_time = 4.5 WHERE slug = 'hero-3' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-4 乃保（双挽乃保）発生:9秒 対象:自身 継続時間:20秒 全行動速度を200%(2倍)に上昇
UPDATE heroes SET hs_attack_time = 9 WHERE slug = 'hero-4' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-5 忠臣（桜華忠臣）発生:5.8秒 攻撃補正:99999%(確殺) 攻撃範囲:前方28ﾏｽ幅5ﾏｽ 前方射出
UPDATE heroes SET hs_attack_time = 5.8 WHERE slug = 'hero-5' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-6 ジャンヌ（ジャンヌ ダルク）発生:5秒 対象:味方全員 自動復活を付与
UPDATE heroes SET hs_attack_time = 5 WHERE slug = 'hero-6' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-7 マルコス（マルコス'55）発生:1.3秒 対象:自身 体力全回復 永続的に攻撃力と防御120%(1.2倍)ずつ上昇(3段階まで
UPDATE heroes SET hs_attack_time = 1.3 WHERE slug = 'hero-7' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-8 ルチアーノ（ルチアーノ）発生:0.91秒 対象:時間 入力可能時間:2.4秒 時間を停止 攻撃力を9999900%(9999
UPDATE heroes SET hs_attack_time = 0.91 WHERE slug = 'hero-8' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-9 Voidoll（Voidoll）発生:3.8秒 対象:自身 防御力を400%(4倍)に上昇 転送範囲展開[範囲:周囲半径3.5ﾏｽ 
UPDATE heroes SET hs_attack_time = 3.8 WHERE slug = 'hero-9' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-10 まとい（深川まとい）発生:5.9秒 自身右側にタレット設置[攻撃補正:80%(0.8倍) 射程16m 攻撃間隔:0.4秒
UPDATE heroes SET hs_attack_time = 5.9 WHERE slug = 'hero-10' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-11 ソル（ソル=バッドガイ）発生:5.3秒 対象:自身 継続時間:11.3秒 攻撃力と防御力を1200%(12倍)に上昇 終了後
UPDATE heroes SET hs_attack_time = 5.3 WHERE slug = 'hero-11' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-12 ディズィー（ディズィー）発生:6.6秒 対象:敵全員 6秒スタン(ガード貫通)
UPDATE heroes SET hs_attack_time = 6.6 WHERE slug = 'hero-12' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-13 グスタフ（グスタフ ハイドリヒ）発生:8.3秒 対象:敵全員 体力11%以上の敵の体力を最大体力の10%にする
UPDATE heroes SET hs_attack_time = 8.3 WHERE slug = 'hero-13' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-14 テスラ（ニコラ テスラ）発生:3.1秒 自身正面にコイル設置[攻撃補正:240%(2.4倍) 範囲:コイル直線上 継続時間:
UPDATE heroes SET hs_attack_time = 3.1 WHERE slug = 'hero-14' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-15 ミク（初音 ミク）発生:7.3秒 対象:自身 範囲:周囲半径3ﾏｽ 継続時間:15秒 範囲内の味方の体力を0.6秒毎に
UPDATE heroes SET hs_attack_time = 7.3 WHERE slug = 'hero-15' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-16 ヴィオレッタ（ヴィオレッタ ノワール）発生:4.5秒 対象:味方全員 範囲:周囲半径3ﾏｽ 継続時間:14秒 範囲内の敵にサイレント(ガー
UPDATE heroes SET hs_attack_time = 4.5 WHERE slug = 'hero-16' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-17 コクリコ（コクリコット ブランシュ）発生:6.2秒 対象:自身 範囲:周囲半径3.5ﾏｽ 継続時間:15秒 範囲内の敵を8秒間、攻撃力を
UPDATE heroes SET hs_attack_time = 6.2 WHERE slug = 'hero-17' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-18 リュウ（リュウ）発生:2.2秒 攻撃補正:10000%(100倍) 攻撃範囲:前方22ﾏｽ幅2.5ﾏｽ 前方射出
UPDATE heroes SET hs_attack_time = 2.2 WHERE slug = 'hero-18' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-19 春麗（春麗）発生:1.5秒 攻撃補正:99999%(確殺) 攻撃範囲:前方3ﾏｽ扇型 攻撃間隔:0.2秒 最大1
UPDATE heroes SET hs_attack_time = 1.5 WHERE slug = 'hero-19' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-20 マリア（マリア=S=レオンブルク）発生:3秒 攻撃補正:600%(6倍) 攻撃範囲:周囲半径2ﾏｽ 攻撃間隔:0.8秒 継続時間:5秒
UPDATE heroes SET hs_attack_time = 3 WHERE slug = 'hero-20' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-21 アダム（アダム=ユーリエフ）発生:2.35秒 攻撃範囲:前方38ﾏｽ幅3ﾏｽ 前方射出 7秒間凍結
UPDATE heroes SET hs_attack_time = 2.35 WHERE slug = 'hero-21' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-22 13（サーティーン(gun)）発生:5.5秒 対象:自身 ロール変更 HPを80%回復 16秒間攻撃力を135%(1.35倍)、防
UPDATE heroes SET hs_attack_time = 5.5 WHERE slug = 'hero-22' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-23 勇者（かけだし勇者）発生:3.3秒 対象:味方全員 継続時間:9秒 攻撃力を300%(3倍)、HPを187%の持続回復、
UPDATE heroes SET hs_attack_time = 3.3 WHERE slug = 'hero-23' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-24 エミリア（エミリア）発生:6.6秒 対象:自身 攻撃補正:68%(0.68倍) 射程:周囲半径16m 攻撃間隔:0.16
UPDATE heroes SET hs_attack_time = 6.6 WHERE slug = 'hero-24' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-25 レム（レム）発生:5.8秒 対象:自身 継続時間:6.85秒 攻撃力を1000%(10倍)、防御力を600%(6
UPDATE heroes SET hs_attack_time = 5.8 WHERE slug = 'hero-25' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-26 カイ（カイ=キスク）発生:1.3秒 攻撃補正:400%(4倍) 攻撃範囲:前方20ﾏｽ幅3ﾏｽ 前方突進 6秒スタン(ガ
UPDATE heroes SET hs_attack_time = 1.3 WHERE slug = 'hero-26' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-27 メグメグ（メグメグ）発生:7秒 自身正面にガトりん設置[攻撃補正:88%(0.88倍) 射程:無限 攻撃間隔:0.5秒 
UPDATE heroes SET hs_attack_time = 7 WHERE slug = 'hero-27' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-28 リン（鏡音 リン）発生:7.7秒 対象:自身 範囲:周囲半径最大7ﾏｽ 継続時間:17秒 自身の攻撃力を300%(3倍
UPDATE heroes SET hs_attack_time = 7.7 WHERE slug = 'hero-28' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-29 レン（鏡音 レン）発生:7.23秒 対象:自身 攻撃補正:250%(2.5倍) 攻撃範囲:周囲半径2ﾏｽ 攻撃間隔:0
UPDATE heroes SET hs_attack_time = 7.23 WHERE slug = 'hero-29' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-30 イスタカ（イスタカ）発生:4.2秒 対象:敵指定 攻撃補正:220%(2.2倍)[1100%(11倍)] 攻撃範囲:周囲
UPDATE heroes SET hs_attack_time = 4.2 WHERE slug = 'hero-30' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-31 ザクレイ（ザック&レイチェル）発生:5.3秒 対象:自身 次回ダッシュアタックに[攻撃補正:99999%(確殺) ガード貫通]を付
UPDATE heroes SET hs_attack_time = 5.3 WHERE slug = 'hero-31' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-32 きらら（輝龍院きらら）発生:7.5秒 炎龍召喚[対象:全ポータル 攻撃補正:400%(4倍) 攻撃間隔:0.2秒 攻撃範囲
UPDATE heroes SET hs_attack_time = 7.5 WHERE slug = 'hero-32' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-33 モノクマ（モノクマ）発生:2.3秒 範囲:前方20ﾏｽ扇型 範囲内の敵1体を捕獲して攻撃補正:99999%(確殺)のダメ
UPDATE heroes SET hs_attack_time = 2.3 WHERE slug = 'hero-33' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-34 ポロロッチョ（ポロロッチョ）発生:2.5秒 対象:自身 攻撃補正:200%(2倍) 攻撃範囲:周囲半径6ﾏｽ 攻撃間隔:0.15
UPDATE heroes SET hs_attack_time = 2.5 WHERE slug = 'hero-34' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-35 アクア（アクア）発生:4秒 対象:敵全員 攻撃補正:50%(0.5倍) ダウン ガードブレイク バフキャンセル 持続
UPDATE heroes SET hs_attack_time = 4 WHERE slug = 'hero-35' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-36 めぐみん（めぐみん）発生:7.7秒 対象:ポータル指定 攻撃補正:99900%(999倍) 攻撃範囲:周囲半径5.5ﾏｽ
UPDATE heroes SET hs_attack_time = 7.7 WHERE slug = 'hero-36' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-37 ソーン（ソーン=ユーリエフ）発生5秒: 対象:自身 範囲:周囲半径1.5ﾏｽ 設置間隔:0.7秒 継続時間:5秒 凍結エリア設置
UPDATE heroes SET hs_attack_time = 5 WHERE slug = 'hero-37' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-38 リヴァイ（リヴァイ）発生:2秒 攻撃補正:99999%(確殺) 攻撃範囲:前方33ﾏｽ幅2.4ﾏｽ 前方突進 最長距離移
UPDATE heroes SET hs_attack_time = 2 WHERE slug = 'hero-38' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-39 デルミン（デビルミント鬼龍 デルミン）発生:3.22秒 攻撃補正:270%(2.7倍) 攻撃範囲:前方25ﾏｽ扇型 攻撃間隔:0.3秒 継
UPDATE heroes SET hs_attack_time = 3.22 WHERE slug = 'hero-39' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-40 トマス（トマス）発生:6.3秒 対象:自身 体力を0.8秒毎に6.7%回復 トランク攻撃[攻撃補正:150%(1.5
UPDATE heroes SET hs_attack_time = 6.3 WHERE slug = 'hero-40' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-41 猫宮（猫宮ひなた(AR)）発生:11秒 対象:ポータル指定 物資投下 取得時[対象:自身 攻撃補正:99999%(確殺) 継続
UPDATE heroes SET hs_attack_time = 11 WHERE slug = 'hero-41' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-42 岡部（岡部 倫太郎）発生:0.8秒 対象:ポータル指定 対象ポータルの拡張範囲を60%縮小する
UPDATE heroes SET hs_attack_time = 0.8 WHERE slug = 'hero-42' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-43 零夜（零夜）発生:5.3秒 対象:直近の敵 もう一人の僕召喚[継続時間:9秒 移動速度:3.92ﾏｽ/秒 追尾 
UPDATE heroes SET hs_attack_time = 5.3 WHERE slug = 'hero-43' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-44 オルタ（セイバーオルタ）発生:3.85秒 攻撃補正:99999%(確殺) 攻撃範囲:前方50ﾏｽ幅3ﾏｽ 継続時間:7秒 前
UPDATE heroes SET hs_attack_time = 3.85 WHERE slug = 'hero-44' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-45 ギルガメッシュ（ギルガメッシュ）発生:3.7秒 対象:敵指定 範囲:周囲半径4ﾏｽ 引寄速度2.62ﾏｽ/秒 8.55秒後に時空断層
UPDATE heroes SET hs_attack_time = 3.7 WHERE slug = 'hero-45' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-46 ルルカ（ルルカ）発生:7.87秒 対象:前方8ﾏｽ マジカルフレイム投擲[攻撃補正:200%(2倍) 継続時間:7.
UPDATE heroes SET hs_attack_time = 7.87 WHERE slug = 'hero-46' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-47 ピエール（ピエール77世）発生:6.88秒 対象:自身 継続時間:24.5秒 攻撃力を400%(4倍)、防御力を300%(3倍
UPDATE heroes SET hs_attack_time = 6.88 WHERE slug = 'hero-47' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-48 忠信（佐藤四郎兵衛忠信）発生:7.5秒 自身背後に千本桜設置[範囲:周囲半径5ﾏｽ 継続時間:15.5秒 範囲内の味方のクー
UPDATE heroes SET hs_attack_time = 7.5 WHERE slug = 'hero-48' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-49 アイズ（アイズ・ヴァレンシュタイン）発生:1.7秒 攻撃補正:140%(1.4倍) 攻撃範囲:前方21ﾏｽ幅2.5ﾏｽ 前方突進 打ち上
UPDATE heroes SET hs_attack_time = 1.7 WHERE slug = 'hero-49' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-50 甘色（狐ヶ咲 甘色）発生:6秒 対象:自身 継続時間:14.75秒 通常攻撃を射程:24m ガード貫通 障害物貫通に変更
UPDATE heroes SET hs_attack_time = 6 WHERE slug = 'hero-50' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-51 ノクティス（ノクティス）発生:1.5秒 攻撃範囲:前方円型半径8ﾏｽ ファントムソード[攻撃補正:100% 攻撃回数:9回]
UPDATE heroes SET hs_attack_time = 1.5 WHERE slug = 'hero-51' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-52 ニーズヘッグ（ニーズヘッグ）発生:14秒〜17秒 対象:指定した5箇所 ミサイル発射[攻撃補正:400%(4倍) 最大HIT数:
UPDATE heroes SET hs_attack_time = 14 WHERE slug = 'hero-52' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-53 敦（中島 敦）発生:5.17秒 対象:自身 継続時間:14.8秒 攻撃力を300%(3倍)、移動速度を130%(1
UPDATE heroes SET hs_attack_time = 5.17 WHERE slug = 'hero-53' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-54 芥川（芥川 龍之介）発生:2.7秒 攻撃補正:99999%(確殺) 攻撃範囲:前方12ﾏｽ幅4ﾏｽ 前方射出 ガード貫通
UPDATE heroes SET hs_attack_time = 2.7 WHERE slug = 'hero-54' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-55 GBG（ゲームバズーカガール）発生:5.4秒 攻撃補正:400%(4倍) 攻撃範囲:前方100ﾏｽ後方100ﾏｽ幅4ﾏｽ 継続時間
UPDATE heroes SET hs_attack_time = 5.4 WHERE slug = 'hero-55' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-56 ライザ（ライザリン・シュタウト）発生:2.3秒〜4.5秒 攻撃範囲:前方18ﾏｽ幅1ﾏｽ 攻撃間隔:0.2秒 攻撃補正:300%(3
UPDATE heroes SET hs_attack_time = 2.3 WHERE slug = 'hero-56' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-57 アリス（青春 アリス）発生:5秒 対象:自身 発動時に指定した味方の後方に座標を固定してワープ
UPDATE heroes SET hs_attack_time = 5 WHERE slug = 'hero-57' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-58 ジョーカー（ジョーカー）発生:7.34秒 対象:自身 継続時間:70秒 全攻撃強制弱点 カードの威力を150%(1.5倍)に
UPDATE heroes SET hs_attack_time = 7.34 WHERE slug = 'hero-58' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-59 イグニス（イグニス=ウィル=ウィスプ）発生:2.4秒 攻撃範囲:周囲半径2.5ﾏｽ 攻撃補正:99999%(確殺) 攻撃間隔:0.22秒 
UPDATE heroes SET hs_attack_time = 2.4 WHERE slug = 'hero-59' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-60 アインズ（アインズ・ウール・ゴウン）発生:7.05秒 対象:自身 防御力を700%(7倍)に上昇 移動速度を150%(1.5倍)[<sp
UPDATE heroes SET hs_attack_time = 7.05 WHERE slug = 'hero-60' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-61 輪廻（糸廻 輪廻）発生:8.55秒 周囲半径4.5ﾏｽ内にあみぐるみ機雷を10個設置[攻撃補正:500%(5倍) 接触
UPDATE heroes SET hs_attack_time = 8.55 WHERE slug = 'hero-61' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-62 キリト（キリト）発生:1.35秒〜5秒 攻撃範囲:前方円型半径2〜10ﾏｽ 移動距離:13ﾏｽ 攻撃間隔:0.27秒
UPDATE heroes SET hs_attack_time = 1.35 WHERE slug = 'hero-62' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-63 アスナ（アスナ）発生:1.45秒 攻撃範囲:前方20ﾏｽ幅2.5ﾏｽ [攻撃補正:100%(1倍) 最大HIT数:1
UPDATE heroes SET hs_attack_time = 1.45 WHERE slug = 'hero-63' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-64 Bugdoll（Bugdoll）発生:4.7秒〜8.7秒 攻撃範囲:前方無限幅0.87ﾏｽ 6列間隔1.125ﾏｽ  攻撃補正:15
UPDATE heroes SET hs_attack_time = 4.7 WHERE slug = 'hero-64' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-65 ステリア（ステリア・ララ・シルワ）発生:3.3秒 対象:敵指定 攻撃補正:450%(4.5倍) 攻撃範囲:周囲半径5ﾏｽ ダウン ガー
UPDATE heroes SET hs_attack_time = 3.3 WHERE slug = 'hero-65' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-66 ラム（ラム）発生:7.07秒 対象:自身 継続時間:7秒 攻撃力を300%(3倍)、攻撃速度を150%(1.5倍
UPDATE heroes SET hs_attack_time = 7.07 WHERE slug = 'hero-66' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-67 2B（2B）発生:1.6秒 スタンエリア設置[範囲:射程10ﾏｽ幅1ﾏｽ8方向  継続時間:3.84秒 攻撃補正
UPDATE heroes SET hs_attack_time = 1.6 WHERE slug = 'hero-67' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-68 ラヴィ（ラヴィ・シュシュマルシュ）発生:6.6秒 対象:自身 移動速度を116%(1.16倍)[<span class='hs_spd
UPDATE heroes SET hs_attack_time = 6.6 WHERE slug = 'hero-68' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-69 リムル（リムル=テンペスト）発生:1.4秒 対象:前方5ﾏｽ扇型 範囲内の敵1体のステータスとヒーロースキルゲージを5%吸収して
UPDATE heroes SET hs_attack_time = 1.4 WHERE slug = 'hero-69' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-70 アル（アル・ダハブ＝アルカティア）発生:2秒 射程:9ﾏｽ 範囲:8ﾏｽ(円形) 攻撃補正:100%(1倍) 毒エリア設置[中心hit
UPDATE heroes SET hs_attack_time = 2 WHERE slug = 'hero-70' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-71 御坂（御坂美琴）発生:1.87秒 中心1ﾏｽ 攻撃補正:99999%(確殺) 外縁攻撃補正:150%(1.5倍) 攻
UPDATE heroes SET hs_attack_time = 1.87 WHERE slug = 'hero-71' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-72 アクセラ（アクセラレータ）発生2.76秒 射程:5ﾏｽ 範囲:4ﾏｽ(円形) 攻撃補正:1000%(10倍) 攻撃間隔:0.8
UPDATE heroes SET hs_attack_time = 2.76 WHERE slug = 'hero-72' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-73 ぶれどら（ぶれいずどらごん）発生:5.3秒 攻撃補正:99999%(確殺) 攻撃範囲:前方43ﾏｽ幅0.3ﾏｽ 前方射出 発生か
UPDATE heroes SET hs_attack_time = 5.3 WHERE slug = 'hero-73' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-74 ベル（ベル・クラネル）発生:1.3秒 攻撃補正:450%(4.5倍) 攻撃範囲:前方14ﾏｽ幅3ﾏｽ 前方突進 ガードブレ
UPDATE heroes SET hs_attack_time = 1.3 WHERE slug = 'hero-74' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-75 ロキシー（ロキシー・ミグルディア）発生:2.5秒 対象:敵全員 キャラ方向に速度4.75ﾏｽ/秒で押し出し
UPDATE heroes SET hs_attack_time = 2.5 WHERE slug = 'hero-75' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-76 某（某＜なにがし＞）発生:1.77秒 攻撃補正:150%(1.5倍) 攻撃範囲:前方50ﾏｽ幅1.3ﾏｽ 前方5way射
UPDATE heroes SET hs_attack_time = 1.77 WHERE slug = 'hero-76' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-77 ロックマン（ロックマン.EXE&光熱斗）発生:4.76秒 継続時間:17.5秒 防御力を250%(2.5倍)に上昇 追加カードP.Aゼータキ
UPDATE heroes SET hs_attack_time = 4.76 WHERE slug = 'hero-77' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-78 クーシー（クー・シー）発生:4.66秒 継続時間:16.5秒 防御力を1200%(12倍)に上昇 HPを100%回復  H
UPDATE heroes SET hs_attack_time = 4.66 WHERE slug = 'hero-78' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-79 デンジ（デンジ）発生:1.16秒 対象:自身 突進[継続時間:4.1秒 攻撃補正99999%(確殺)] 5.8秒後に
UPDATE heroes SET hs_attack_time = 1.16 WHERE slug = 'hero-79' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-80 パワー（パワー）発生:2秒 対象:索敵範囲内の敵 攻撃補正:500%(5倍) 攻撃範囲:周囲3.5ﾏｽ 攻撃間隔:2
UPDATE heroes SET hs_attack_time = 2 WHERE slug = 'hero-80' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-81 アミスター（アミスター=バランディン）発生:5.84秒 対象:自身 発動時自身のHPを100%回復 継続時間:19.5秒 攻撃力を300%
UPDATE heroes SET hs_attack_time = 5.84 WHERE slug = 'hero-81' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-82 シノン（シノン）発生:1.43秒 対象:敵指定 攻撃補正:99999%(確殺) 攻撃範囲:前方100ﾏｽ幅1ﾏｽ射角
UPDATE heroes SET hs_attack_time = 1.43 WHERE slug = 'hero-82' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-83 ターニャ（ターニャ・デグレチャフ）発生:5.6秒 対象:敵指定 攻撃補正:99999%(確殺) 攻撃範囲:周囲半径9.5ﾏｽ ガード貫
UPDATE heroes SET hs_attack_time = 5.6 WHERE slug = 'hero-83' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-84 うら（鬼ヶ式 うら）発生:5秒〜6.2秒 式神の拳叩きつけ[範囲:1.5ﾏｽ(円形) 攻撃補正99999%(確殺)] 衝
UPDATE heroes SET hs_attack_time = 5 WHERE slug = 'hero-84' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-85 コラプス（コラプス）発生:4.66秒 巨大ブラックホール生成[範囲:9ﾏｽ(球体) 移動距離:15ﾏｽ 移動速度:1.2
UPDATE heroes SET hs_attack_time = 4.66 WHERE slug = 'hero-85' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-86 ボンドルド（ボンドルド）発生:1.36秒 攻撃補正:99999%(確殺) 攻撃範囲:前方5ﾏｽ幅2ﾏｽ 前方射出
UPDATE heroes SET hs_attack_time = 1.36 WHERE slug = 'hero-86' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-87 みりぽゆ（みりぽゆ）発生:7.5秒/3.5秒 ぽゆーん召喚[攻撃補正:26.9%(0.269倍)  攻撃間隔:0.13秒
UPDATE heroes SET hs_attack_time = 7.5 WHERE slug = 'hero-87' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-88 ゴン（ゴン=フリークス）発生:9秒 対象:自身 継続時間:20秒 攻撃力を800%(8倍)、防御力を1200%(12倍)、移
UPDATE heroes SET hs_attack_time = 9 WHERE slug = 'hero-88' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-89 キルア（キルア=ゾルディック）発生:5.3秒 対象:自身 継続時間:13秒 全行動速度を140%(1.4倍)に上昇、攻撃力を125
UPDATE heroes SET hs_attack_time = 5.3 WHERE slug = 'hero-89' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-90 チーちゃん（チーちゃん）発生:2秒 対象:自身 突進[継続時間:1.2〜7.3秒 範囲:幅3ﾏｽ 攻撃補正180%(1.8倍
UPDATE heroes SET hs_attack_time = 2 WHERE slug = 'hero-90' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-91 上条（上条当麻）発生:5.2秒 攻撃補正:99999%(確殺) 攻撃範囲:周囲半径10ﾏｽ 継続時間:4秒 攻撃間隔
UPDATE heroes SET hs_attack_time = 5.2 WHERE slug = 'hero-91' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-92 ペルリニエ（ーペルリニエ）発生:4.5秒 対象:指定ポータル 攻撃補正:300%(3倍) 攻撃範囲:周囲半径5ﾏｽ デバフエリ
UPDATE heroes SET hs_attack_time = 4.5 WHERE slug = 'hero-92' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-93 シャドウ（シャドウ）発生:0.1秒 範囲:周囲半径7.5ﾏｽ 移動速度を55%(0.45倍)減少する魔法陣展開 4.4秒
UPDATE heroes SET hs_attack_time = 0.1 WHERE slug = 'hero-93' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-94 ポプテピ（ポプ子&ピピ美）発生:1秒 移動速度7.16ﾏｽ/秒の自爆準備 6.5秒後に自爆[範囲:周囲半径4ﾏｽ 攻撃補正:9
UPDATE heroes SET hs_attack_time = 1 WHERE slug = 'hero-94' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-95 メルーニャ（メルーニャ・ランチェルナ）発生:1.3秒/4.9秒 精霊召喚を1体召喚 5体召喚時[攻撃補正:99999%(確殺) 攻撃範囲:
UPDATE heroes SET hs_attack_time = 1.3 WHERE slug = 'hero-95' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-96 セイバー（セイバー）発生:7.36秒 攻撃補正:99999%(確殺) 攻撃範囲:前方20ﾏｽ幅12ﾏｽ扇型 前方射出 ガ
UPDATE heroes SET hs_attack_time = 7.36 WHERE slug = 'hero-96' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-97 アーチャー（アーチャー）発生:1秒 対象:敵指定 範囲:周囲半径10ﾏｽ 引寄速度1.68ﾏｽ/秒 6.5秒後に周囲半径4ﾏ
UPDATE heroes SET hs_attack_time = 1 WHERE slug = 'hero-97' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-98 ランサー（ランサー）発生:7.7秒 攻撃補正:99999%(確殺) 攻撃範囲:周囲半径4ﾏｽ ガード貫通 周囲30ﾏｽに
UPDATE heroes SET hs_attack_time = 7.7 WHERE slug = 'hero-98' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-99 ファースト（ファースト）発生:8.1秒 攻撃補正:99999%(確殺) 攻撃範囲:指定直線上 幅5ﾏｽ カード&カウンター貫
UPDATE heroes SET hs_attack_time = 8.1 WHERE slug = 'hero-99' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-100 レゼ（レゼ）発生:5秒 範囲:前方21ﾏｽ扇型 範囲内のポータルに対してミサイルキックによる爆撃[範囲:周囲半径
UPDATE heroes SET hs_attack_time = 5 WHERE slug = 'hero-100' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-101 シャルル（シャルル・リヒター）発生:7.37秒 対象:敵全員 攻撃補正:500%(5倍)の処刑剣召喚[範囲:周囲半径4ﾏｽ  0.
UPDATE heroes SET hs_attack_time = 7.37 WHERE slug = 'hero-101' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-102 一姫（一姫）発生:6.9秒 攻撃補正:99999%(確殺) 攻撃範囲:前方3ﾏｽを基準に点数で変動[前方4ﾏｽ幅
UPDATE heroes SET hs_attack_time = 6.9 WHERE slug = 'hero-102' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-103 エドワード（エドワード・エルリック）発生:2.85秒 自身前方に巨壁を錬成[幅10ﾏｽ 進行距離:23ﾏｽ 挟撃判定発生時に攻撃補正:9
UPDATE heroes SET hs_attack_time = 2.85 WHERE slug = 'hero-103' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- hero-104 タココ（オクトバリ・ニャル・タココ）発生:2.95秒 攻撃範囲:前方16ﾏｽ幅2ﾏｽ 自身前方に触手召喚[直撃時攻撃補正:99999%(
UPDATE heroes SET hs_attack_time = 2.95 WHERE slug = 'hero-104' AND hs_attack_time IS NULL AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
