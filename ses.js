/*
 * @file Fate/Grand Orderのサーヴァント強化に使用する種火の個数をシミュレートします。
 * @author 秋ノ字<https://twitter.com/akinoji3721>
 * @since v1.0.0
 * @version v1.2.0
 */

/** セクションテンプレート */
Vue.component('section-item', {props: {label: String}, template: '#sectionItem'});

/** フォーム要素テンプレート */
Vue.component('form-item', {props: {label: String}, template: '#formItem'});

/** レアリティ */
var rarityList = {
    5: {name: "★5", lvLimit: [50, 60, 70, 80, 90, 92, 94, 96, 98, 100, 120]},
    4: {name: "★4", lvLimit: [40, 50, 60, 70, 80, 85, 90, 92, 94, 96, 98, 100, 120]},
    3: {name: "★3", lvLimit: [30, 40, 50, 60, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100, 120]},
    2: {name: "★2（★0）", lvLimit: [25, 35, 45, 55, 65, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100, 120]},
    1: {name: "★1", lvLimit: [20, 30, 40, 50, 60, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100, 120]},
};

/** 最小レベル */
const lvMin = 1;

/** 最大レベル */
const lvMax = 120;

/** 種火レアリティ */
var seedFireRarityList = [
    {value: 3, name: "★3"},
    {value: 4, name: "★4"},
    {value: 5, name: "★5"},
];

/** 種火クラス一致 */
var matchClassList = [
    {value: parseFloat(1.2), name: "一致"},
    {value: parseFloat(1.0), name: "不一致"},
];

/** 経験値係数 */
var expFactorList = [
    {value: 1.0, name: "等倍"},
    {value: 2.0, name: "2倍"},
];

/** 端数処理 */
var fractionList = [
    {value: 0, name: '切り捨て'},
    {value: 1, name: '四捨五入'},
    {value: 2, name: '切り上げ'},
];

/** 経験値リスト */
var expList = []

/** ステータス */
var params = new Vue({
    el: '#params',
    data: {
        rarity: 5,
        lvFrom: 1,
        expNext: 100,
        expMax: 100,
        seedFireRarity: 4,
        matchClass: 1.2,
        expFactor: 1.0,
        fraction: 2,
    },
    mounted: function() {
        this.$nextTick(function() {
            // 経験値リスト生成
            this.createExpList();
            // 初期化
            this.initialize();
        })
    },
    methods: {
        /**
         * 経験値リスト生成
         */
        createExpList: function() {
            // リストオブジェクト初期化
            expList = [{lv: 0, total: 0, next: 0}];
            // Lvごとに処理
            for (let i = lvMin; i <= lvMax; i++) {
                // 新規行オブジェクト生成
                let newRow = {lv: i, total: 0, next: 0};
                // 前Lvの総経験値とNext値を取得
                let lastTotal = expList[i - 1].total;
                let lastNext = expList[i - 1].next;
                // 総経験値は上記の合算
                newRow.total = lastTotal + lastNext;
                // Next値はLv90未満、100未満、それ以上で数式を分ける
                if (i < 120) {
                    if (i < 90) {
                        // 90未満: 前LvのNext値 + 現Lv * 100
                        newRow.next = lastNext + i * 100;
                    }
                    else if (i < 100) {
                        // 90以上100未満: 前LvのNext値 + (現Lv * (現Lv - 89)) * 200
                        newRow.next = lastNext + i * (i - 89) * 200;
                    }
                    else {
                        // 100以上: 20311500
                        newRow.next = 20311500;
                    }
                }
                // オブジェクトを追加
                expList.push(newRow);
            }
        },
        /**
         * 初期化
         */
        initialize: function() {
            // 各種パラメータを初期化
            this.rarity = 5;
            this.lvFrom = 1;
            this.setNext();
            this.seedFireRarity = 4;
            this.matchClass = 1.2;
            this.expFactor = 1.0;
            this.fraction = 2;
            reqSeedFire.nextLvLimit = rarityList[this.rarity].lvLimit[0];
            // シミュレートを行う
            this.simulate(0, 1);
        },
        /**
         * 目標Lvを現在Lvに合わせた値へ変更する
         */
        setNextLvLimit: function() {
            if (this.lvFrom < lvMax) {
                reqSeedFire.nextLvLimit = rarityList[this.rarity].lvLimit.find(elem => elem > this.lvFrom);
            }
            else {
                reqSeedFire.nextLvLimit = lvMax;
            }
        },
        /**
         * Nextを現在Lvに合わせた値へ変更する
         */
        setNext: function() {
            this.expNext = expList[this.lvFrom].next;
            this.expMax = expList[this.lvFrom].next;
        },
        /**
         * 種火一つあたりの経験値（各種変数適用後）を取得する
         * @param synResult 合成結果
         * @return 種火一つあたりの経験値（各種変数適用後）
         */
        getExpPerSeedFire(synResult) {
            let expBase = 3 ** (this.seedFireRarity - 2) * 3000;
            return expBase * this.matchClass * this.expFactor * synResult;
        },
        /**
         * 必要な種火数を算出する
         * @param exp 経験値
         * @param synResult 合成結果
         */
        getUseSeedFire: function(exp, synResult) {
            let ret = 0;
            let mathBase = exp / this.getExpPerSeedFire(synResult);
            switch (this.fraction) {
                // 切り捨て
                case 0:
                    ret = Math.floor(mathBase);
                    break;
                // 四捨五入
                case 1:
                    ret = Math.round(mathBase);
                    break;
                // 切り上げ
                case 2:
                    ret = Math.ceil(mathBase);
                    break;
            }
            return ret;
        },
        /**
         * シミュレート
         * @param useSeedFire 使用種火数
         * @param synResult 合成結果
         */
        simulate: function(useSeedFire = 0, synResult = 1) {
            // 合成後の総経験値を算出（上限Lvのtotalを上限とする）
            let synthesizedTotalExp = this.currentTotalExp + (this.getExpPerSeedFire(synResult) * useSeedFire);
            synthesizedTotalExp = Math.min(synthesizedTotalExp, expList[reqSeedFire.nextLvLimit].total);

            // 合成後のLvとNext値、および目標Lvを取得・設定
            if (synthesizedTotalExp < expList[lvMax].total) {
                this.lvFrom = expList.find(elem => (elem.total + elem.next) > synthesizedTotalExp).lv;
                this.expNext = expList[this.lvFrom + 1].total - synthesizedTotalExp;
            }
            else {
                this.lvFrom = lvMax;
                this.expNext = expList[lvMax].next;
            }
            this.expMax = expList[this.lvFrom].next;
            this.setNextLvLimit();

            // 目標Lvまでに必要な種火数を算出・設定
            let reqExpForNextLvLimit = expList[reqSeedFire.nextLvLimit].total - synthesizedTotalExp;
            reqSeedFire.rowData[0].useSeedFire = this.getUseSeedFire(reqExpForNextLvLimit, 1);
            reqSeedFire.rowData[1].useSeedFire = this.getUseSeedFire(reqExpForNextLvLimit, 2);
            reqSeedFire.rowData[2].useSeedFire = this.getUseSeedFire(reqExpForNextLvLimit, 3);

            // 目標Lvより後の各種値を算出・出力する
            let rarityLvLimit = rarityList[this.rarity].lvLimit;
            let useSeedFireAmount = reqSeedFire.rowData[0].useSeedFire;
            reqSeedFireAfter.rowData.splice(0, reqSeedFireAfter.rowData.length);
            for (let i = 0; i < rarityLvLimit.length - 1; i++) {
                if (rarityLvLimit[i] >= reqSeedFire.nextLvLimit) {
                    let lvFrom = rarityLvLimit[i];
                    let lvTo = rarityLvLimit[i + 1];
                    let useSeedFire = this.getUseSeedFire(expList[lvTo].total - expList[lvFrom].total, 1);
                    useSeedFireAmount += useSeedFire;
                    reqSeedFireAfter.rowData.push({
                        lvFrom: lvFrom,
                        lvTo: lvTo,
                        useSeedFire: useSeedFire,
                        useSeedFireAmount: useSeedFireAmount,
                    });
                }
            }
        },
        /**
         * パラメータ変更時
         * @param e イベントハンドラ
         */
        changeParam: function(e) {
            // 内部値書換
            switch (e.target.name) {
                case 'matchClass':
                case 'expFactor':
                    this[e.target.name] = parseFloat(e.target.value);
                    break;
                default:
                    this[e.target.name] = parseInt(e.target.value);
            }
            // 現在Lv変更時、Nextと目標Lvの更新も行う
            if (e.target.name == 'lvFrom') {
                this.setNext();
                this.setNextLvLimit();
            }
            // シミュレート
            this.simulate();
        }
    },
    computed: {
        /**
         * 現在の総経験値
         */
        currentTotalExp: function() {
            let ret = 0;
            if (this.lvFrom < lvMax) {
                // 100未満: 次Lvのtotal - 現在のnext
                ret = expList[this.lvFrom + 1].total - this.expNext;
            }
            else {
                // 100: 現在Lvのtotal
                ret = expList[this.lvFrom].total;
            }
            return ret;
        },
    },
});

/** 必要種火数(目標Lvまで) */
var reqSeedFire = new Vue({
    el: '#reqSeedFire',
    data: {
        nextLvLimit: 50,
        headerLabel: [
            ['想定結果'],
            ['必要種火数'],
            ['実際の結果', '（再シミュレート）']
        ],
        rowData: [
            {result: 1, name: '成功', useSeedFire: 65, readOnly: true},
            {result: 2, name: '大成功', useSeedFire: 33, readOnly: true},
            {result: 3, name: '極大成功', useSeedFire: 21, readOnly: true},
            {result: 0, name: '成功', useSeedFire: 20, readOnly: false},
        ],
    },
    methods: {
        /**
         * 再シミュレート
         * @param idx 行インデックス
         * @param synResult 合成結果
         */
        reSimulate: function(idx, synResult) {
            params.simulate(this.rowData[idx].useSeedFire, synResult);
        },
    },
});

/** 必要種火数(目標Lv以降) */
var reqSeedFireAfter = new Vue({
    el: '#reqSeedFireAfter',
    data: {
        headerLabel: [
            ['Lv区間'],
            ['必要種火数', '（区間ごと）'],
            ['必要種火数', '（総計）']
        ],
        rowData: [],
    }
});

/** 取扱説明書 */
var howTo = new Vue({
    el: '#howTo',
    data: {
        items: [
            {
                title: '概要',
                textList: [
                    '大成功や極大成功の場合を含めた、次の上限Lvまでに必要な種火の個数を計算します。',
                ],
            },
            {
                title: 'ステータスの変更',
                textList: [
                    'ステータスを変更すると、自動で再計算が行われます。',
                    '必要個数の小数点以下を切り捨てるか、四捨五入するか、切り上げるかは端数欄で設定できます。',
                ],
            },
            {
                title: '合成結果の反映',
                textList: [
                    '成功、大成功、極大成功のいずれか押すと、ボタンの種類と対応する行の必要種火数に応じた経験値がパラメータへ加算されます。',
                    '想定結果に（任意）と書かれている行は、使用する種火の数を任意に設定できます。（それ以外は固定です）',
                ],
            },
            {
                title: '動作環境',
                textList: [
                    'Google Chrome（PC）およびSafari（iPhone,iPad）での動作を確認しております。不具合があった場合は詳細と共にご連絡ください。',
                ],
            },
            {
                title: '規約・免責事項等',
                textList: [
                    '本ページは自分こと秋ノ字（<a href="https://twitter.com/akinoji3721">Twitter</a>, <a href="https://note.com/akinoji">Note</a>）が非公式に作成したものです。問合せは左記アカウントへご連絡ください。',
                    '表示される内容の正確性は保証いたしかねます。本ページの利用によって発生する不利益や損害へは責任を負いかねますので、予めご了承ください。',
                    'ソースの二次利用に関しては事前にご連絡を頂きますようお願いいたします。無断の二次利用を見かけた際はご一報いただけますと幸いです。',
                ],
            },
        ],
    },
});

/** 更新履歴 */
var updateLog = new Vue({
    el: '#updateLog',
    data: {
        items: [
            {
                date: '2021-08-04',
                version: '1.2.0',
                textList: [
                    'Lv上限上昇対応、種火レアリティ選択機能実装。'
                ],
            },
            {
                date: '2020-10-25',
                version: '1.1.1',
                textList: [
                    'CSSを修正。'
                ],
            },
            {
                date: '2020-10-24',
                version: '1.1.0',
                textList: [
                    'フレームワークをjQuery+bootstrapからVue.js+Bulmaへ変更。',
                    'パラメータに「クラス一致」「経験値倍率」を追加。',
                ],
            },
            {
                date: '2019-11-27',
                version: '1.0.0',
                textList: [
                    '公開。',
                ],
            },
        ],
    },
});

