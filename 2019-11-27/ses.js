/*
 * @file Fate/Grand Orderのサーヴァント強化に使用する種火の個数をシミュレートします。
 * @author 秋ノ字<https://twitter.com/akinoji3721>
 * @since v1.0.0
 * @version v1.0.1
 */

////////////////////////////////////////////////////////////////////////////////////////////////////
// 呼出処理
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * シミュレーション実行
 * @param useSeedFire 種火使用数（★4一致）
 * @param synResult 合成結果（1=成功、2=大成功、3=極大成功）
 */
function execSimulate(useSeedFire, synResult) {

	// パラメータ取得(Lv上限以外)
	var params = {
		rarity: parseInt($('select[name="rarity"]').val()),
		levelFrom: parseInt($('select[name="levelFrom"]').val()),
		expNext: parseInt($('input[name="expNext"]').val()),
		fraction: parseInt($('select[name="fraction"]').val()),
		nextLvLimit1: parseInt($('#nextLvLimit1').text()),
		nextLvLimit2: parseInt($('#nextLvLimit2').text()),
		addExp: 32400 * useSeedFire * synResult
	}
	
	// JSON読込(上限Lvは該当レアリティのものを抽出)
	var lvLimit = JSON.parse($('#lvLimit').html())[params['rarity']];
	var expList = JSON.parse($('#expList').html());
	
	// パラメータ取得(Lv上限)
	if(lvLimit.indexOf(params['levelFrom']) < lvLimit.length - 1) {
		params['nextLvLimit1'] = $.grep(lvLimit, function(elem, index) {
			return (elem > params['levelFrom']);
		})[0];
	}   
	else {
		params['nextLvLimit1'] = params['levelFrom'];
	}
	if(lvLimit.indexOf(params['nextLvLimit1']) < lvLimit.length - 1) {
		params['nextLvLimit2'] = $.grep(lvLimit, function(elem, index) {
			return (elem > params['nextLvLimit1']);
		})[0];
	}   
	else {
		params['nextLvLimit2'] = params['nextLvLimit1'];
	}

	// 合成シミュレート
	synthesisSimulate(params, lvLimit, expList);
	// 上限Lv更新
	updateLvLimit(params, lvLimit);
	// 必要種火数算出
	calcReqSeedFire(params, lvLimit, expList);
}

/**
 * 合成シミュレート(現在LvとNextの値を更新する)
 * @param params パラメータ
 * @param lvLimit 上限Lv
 * @param expList Lvごとの総経験値およびNext値のリスト
 * @returns
 */
function synthesisSimulate(params, lvLimit, expList) {

	// 現在の総経験値を算出
	var currentTotalExp = calcCurrentTotalExp(params, expList);

	// 合成後の総経験値を算出(上限Lvを超過する場合は上限Lv到達直後に補正)
	var synthesizedTotalExp = currentTotalExp + params['addExp'];
	var synthesizedLvInfo = expList[100];
	if(synthesizedTotalExp < expList[100]['total']) {
		var synthesizedLvInfo = $.grep(expList, function(elem, index) {
			return (elem['total'] <= synthesizedTotalExp && elem['total'] + elem['next'] > synthesizedTotalExp);
		})[0];
	}
	if(synthesizedLvInfo['lv'] >= params['nextLvLimit1']) {
		synthesizedLvInfo = expList[params['nextLvLimit1']];
		synthesizedTotalExp = synthesizedLvInfo['total'];
	}

	// 算出・補正後の現在LvとNext値を画面および引数paramsへ出力
	var synthesizedLevelFrom = synthesizedLvInfo['lv'];
	var synthesizedExpNext = 0;
	if(synthesizedLevelFrom < 100) {
		synthesizedExpNext = expList[synthesizedLevelFrom + 1]['total'] - synthesizedTotalExp;
	}
	else {
		synthesizedExpNext = synthesizedLvInfo['next'];
	}
	$('select[name="levelFrom"]').val(synthesizedLevelFrom);
	$('input[name="expNext"]').val(synthesizedExpNext);
	params['levelFrom'] = parseInt(synthesizedLevelFrom);
	params['expNext'] = parseInt(synthesizedExpNext);
	// 付与経験値の初期化は特に必要ないが、念のためやっておく
	params['addExp'] = 0;
}

/**
 * 現在の総経験値を算出する
 * @param params パラメータ
 * @param expList Lvごとの総経験値およびNext値のリスト
 * @returns
 */
function calcCurrentTotalExp(params, expList) {
	var ret = 0;
	if(params['levelFrom'] < 100) {
		ret = expList[params['levelFrom'] + 1]['total'] - params['expNext'];
	}
	else {
		ret = expList[params['levelFrom']]['total'];
	}
	return ret;
}

/**
 * 表示している上限Lv(「目標Lv:XX」「LvXX以降」)とparamsの同値を更新する
 * @param params パラメータ
 * @param lvLimit 上限Lv
 * @returns
 */
function updateLvLimit(params, lvLimit) {

	// 上限Lv(「目標Lv:XX」「LvXX以降」)を修正
	var remainingLvLimit = $.grep(lvLimit, function(elem, index) {
		return (elem > params['levelFrom']);
	});
	if(remainingLvLimit.length >= 1) {
		$('#nextLvLimit1').text(remainingLvLimit[0]);
		params['nextLvLimit1'] = remainingLvLimit[0];
		if(remainingLvLimit.length >= 2) {
			$('#nextLvLimit2').text(remainingLvLimit[1]);
			params['nextLvLimit2'] = remainingLvLimit[1];
		}
		else {
			$('#nextLvLimit2').text(100);
			params['nextLvLimit2'] = 100;
		}
	}
	else {
		$('#nextLvLimit1').text(100);
		$('#nextLvLimit2').text(100);
		params['nextLvLimit1'] = 100;
		params['nextLvLimit2'] = 100;
	}
}

/**
 * 必要種火数を算出する
 * @param params パラメータ
 * @param lvLimit 上限Lv
 * @param expList Lvごとの総経験値およびNext値のリスト
 * @returns
 */
function calcReqSeedFire(params, lvLimit, expList) {

	// 次の上限Lvまでに必要な総経験値を算出
	var reqExpForNextLvLimit = (expList[params['nextLvLimit1']]['total'] - calcCurrentTotalExp(params, expList));
	var reqSeedFireTotal = 0
	// 端数処理した値を画面に出力
	var usf = $('input[name="useSeedFire"]');
	switch(params['fraction']) {
		// 切り捨て
		case 0:
			$(usf[0]).val(Math.floor(reqExpForNextLvLimit / (32400 * 1)));
			$(usf[1]).val(Math.floor(reqExpForNextLvLimit / (32400 * 2)));
			$(usf[2]).val(Math.floor(reqExpForNextLvLimit / (32400 * 3)));
			reqSeedFireTotal += Math.floor(reqExpForNextLvLimit / 32400);
			break;
		// 四捨五入
		case 1:
			$(usf[0]).val(Math.round(reqExpForNextLvLimit / (32400 * 1)));
			$(usf[1]).val(Math.round(reqExpForNextLvLimit / (32400 * 2)));
			$(usf[2]).val(Math.round(reqExpForNextLvLimit / (32400 * 3)));
			reqSeedFireTotal += Math.round(reqExpForNextLvLimit / 32400);
			break;
		// 切り上げ
		case 2:
			$(usf[0]).val(Math.ceil(reqExpForNextLvLimit / (32400 * 1)));
			$(usf[1]).val(Math.ceil(reqExpForNextLvLimit / (32400 * 2)));
			$(usf[2]).val(Math.ceil(reqExpForNextLvLimit / (32400 * 3)));
			reqSeedFireTotal += Math.ceil(reqExpForNextLvLimit / 32400);
			break;
	}

	// 次の上限Lvより後の値を算出・出力する
	var table = $('div.card#reqSeedFire_after').find('table')[0];
	$(table).find('tbody').empty();
	var remainingLvLimit = $.grep(lvLimit, function(elem, index) {
		return (elem >= params['nextLvLimit1']);
	});
	for(var i = 0; i < remainingLvLimit.length - 1; i++) {
		// 区間ごとの必要種火数と総計値を算出
		var reqExpPart = expList[remainingLvLimit[i + 1]]['total'] - expList[remainingLvLimit[i]]['total'];
		var reqSeedFirePart = 0;
		switch(params['fraction']) {
			// 切り捨て
			case 0:
				reqSeedFirePart = Math.floor(reqExpPart / 32400);
				break;
			// 四捨五入
			case 1:
				reqSeedFirePart = Math.round(reqExpPart / 32400);
				break;
			// 切り上げ
			case 2:
				reqSeedFirePart = Math.ceil(reqExpPart / 32400);
				break;
		}
		reqSeedFireTotal += reqSeedFirePart;

		// 行を作成
		var newRow = $($(table).find('tr[data-tmpname="def"]')[0]).clone(true);
		newRow.removeClass('d-none');
		newRow.removeAttr('data-tmpname');
		$($(newRow).find('span[data-elemname="levelFromTo"]')[0]).text(`${remainingLvLimit[i]} → ${remainingLvLimit[i + 1]}`);
		$($(newRow).find('span[data-elemname="seedFirePart"]')[0]).text(reqSeedFirePart);
		$($(newRow).find('span[data-elemname="seedFireTotal"]')[0]).text(reqSeedFireTotal);
		$($(table).children('tbody')).append(newRow);
	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// イベント
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 画面読込完了時
 */
$(document).ready(function() {
	// 現在Lvを出力
	$('select[name="levelFrom"] option').remove();
	for(var i = 1; i <= 100; i++) {
		$('select[name="levelFrom"]').append($('<option>').html(i).val(i));
	}
	$('select[name="levelFrom"]').val(1);

	// レアリティごとのLv上限を出力
	var lvLimit = {
		'1': [20, 30, 40, 50, 60, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100],
		'2': [25, 35, 45, 55, 65, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100],
		'3': [30, 40, 50, 60, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100],
		'4': [40, 50, 60, 70, 80, 85, 90, 92, 94, 96, 98, 100],
		'5': [50, 60, 70, 80, 90, 92, 94, 96, 98, 100],
	};
	$('#lvLimit').html(JSON.stringify(lvLimit));

	// Lvごとの総経験値およびNext値を出力
	var expList = [{'lv':0 , 'total': 0, 'next': 0}]
	for(var i = 1; i <= 100; i++) {
		// 前Lvの総経験値とNext値を取得
		var lastTotal = expList[i - 1]['total'];
		var lastNext = expList[i - 1]['next'];;
		// 総経験値は上記値の合算
		var expTotal = lastTotal + lastNext;
		// Next値はLv90未満と90以上で数式を分ける
		var expNext = 0;
		if(i < 100) {
			if(i < 90) {
				// 90未満(前LvのNext値 + 現Lv * 100)
				expNext = lastNext + i * 100;
			}
			else {
				// 90以上(前LvのNext値 + (現Lv * (現Lv - 89)) * 200)
				expNext = lastNext + i * (i - 89) * 200;
			}
		}
		expList.push({'lv':i , 'total': expTotal, 'next': expNext});
	}
	$('#expList').html(JSON.stringify(expList));

	// シミュレートを実行
	execSimulate(0, 1);
});

/**
 * 実行ボタン押下時
 */
$('button[name="simulate"]').on('click', function(e) {
	execSimulate(0, 1);
});

/**
 * リセットボタン押下時
 */
$('button[name="reset"]').on('click', function(e) {
	// パラメータを初期化し、シミュレートを行う
	$('select[name="rarity"]').val(5);
	$('select[name="levelFrom"]').val(1);
	$('input[name="expNext"]').val(100);
	$('select[name="fraction"]').val(2);
	execSimulate(0, 1);
});

/**
 * 再シミュレートボタン押下時
 */
$('button[name="reSimulate"]').on('click', function(e) {
	// 種火使用数と合成結果を取得し、シミュレートを行う
	execSimulate($(this).closest('tr').find('input[name="useSeedFire"]').val(), $(this).val());
});

/**
 * 現在Lv変更時
 */
$('select[name="levelFrom"]').on('change', function(e) {
	// Next値を更新する
	var expList = JSON.parse($('#expList').html());
	var next = expList[$(this).val()]['next'];
	$('input[name="expNext"]').val(next);
	$('input[name="expNext"]').attr('max', next);
});
