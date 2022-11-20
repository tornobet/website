let prediction_key = params.key, prediction, remain_seconds = 0, timer

$(document).ready(function () {
  $.getJSON('./info.json', function () { }).done(function (data) {
    predictions = data.predictions
    let filtered_prediction = predictions.filter(function (value) {
      return prediction_key == value.category + '.' + value.type + '.' + value.group + '.' + value.team1 + '.' + value.team2
    });
    prediction = filtered_prediction[0];
    if ('canceled'===prediction.status){
      window.location = '/'
    }
    // prediction.started_at = parseInt((new Date().getTime() / 1000) + 10)
    remain_seconds = parseInt(prediction.started_at) - parseInt((new Date().getTime() / 1000));

    document.title = prediction.team1 + ' VS ' + prediction.team2 + ' Prediction | Tornobet'
    $('#js-group').text(prediction.groupTitle)
    $('.prediction-info #js-team1 .js-name').text(prediction.team1Title)
    $('.prediction-info #js-team1 .js-img').attr(
      'src',
      'images/flags/' + prediction.team1 + '.png',
    )
    $('#js-team1-name').text(prediction.team1Title)

    $('.prediction-info #js-team2 .js-name').text(prediction.team2Title)
    $('.prediction-info #js-team2 .js-img').attr(
      'src',
      'images/flags/' + prediction.team2 + '.png',
    )
    $('#js-team2-name').text(prediction.team2Title)
    if ('undefined' !== typeof prediction.result) {
      $('#js-vs').text(prediction.result.team1 + ' : ' + prediction.result.team2)
    }

    $(document).on('click', '#js-sign-in', function () {
      getWeb3(null, function () {
        predictionSuccess(prediction)
      }, predictionFaild)
    })

    $('#js-sign-in').click();
  })

  $(document).on('click', '#js-set-prediction', function () {
    let selectedOption = $('input[name=result_option]:checked').val()
    if (0 == selectedOption || isNaN(selectedOption)) {
      $('#js-error-text').text('Please select one item to bet!')
      $('#js-error-wrapper').removeClass('d-none')
      // $('#js-toast-text').text('Please select one item to bet!');
      // theToast.show();
      return true
    }

    $('#js-error-wrapper').addClass('d-none')
    $('#js-set-prediction').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>',
    )
    setPrediction(
      $(this).data('prediction_key'),
      selectedOption,
      parseFloat($('input[name=prediction_amount]').val()),
      function (error, predictionsInfo) {
        if (null !== error && ('undefined' !== typeof error.code || false === error.status) && null !== predictionsInfo) {
          $('#js-error-text').text('Bet rejected! Please try again.')
          $('#js-error-wrapper').removeClass('d-none')

          // $('#js-prediction-box-error-icon').removeClass('d-none')
          // $('#js-prediction-box-success-icon').addClass('d-none')
          // $('#js-predictioned-box').removeClass('d-none')

          // $('#js-toast-text').text('Bet rejected! Please try again.');
          // theToast.show();
          $('#js-set-prediction').prop('disabled', false).text('Place a bet')
        } else if (null !== error) {
          if ([-32000, -32603].includes(error.code)) {
            $('#js-error-text').text('Wallet balance is insufficient. Please get some BNB!')
          } else {
            $('#js-error-text').text('Bet rejected! Please try again.')
          }
          $('#js-error-wrapper').removeClass('d-none')
          $('#js-set-prediction').prop('disabled', false).text('Place a bet')
        } else {
          showResults(predictionsInfo, 'set')
          getBalance(function (balance) {
            $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')
          })
          // $('#js-predictioned-box').removeClass('d-none')
          $('#js-set-prediction').prop('disabled', false).text('Bet Again')
        }
      },
    )
  })

  $(document).on('change', 'input[name=prediction_amount]', function () {
    let prediction_amount = parseFloat($(this).val())
    if (prediction_amount < min_qty) {
      prediction_amount = min_qty
      $(this).val(prediction_amount)
    }
    let amount1 = parseFloat($('#js-1-amount').text())
    let amount2 = parseFloat($('#js-2-amount').text())
    let amount3 = parseFloat($('#js-3-amount').text())
    if (amount2 > 0 || amount3 > 0) {
      let profit1 = parseFloat(((prediction_amount / (prediction_amount + amount1)) * (amount2 + amount3) * our_profit_factor).toFixed(4))
      $('#js-1-profit').text('(~ ' + parseFloat(profit1.toFixed(4)) + ' BNB)')
    }
    if (amount1 > 0 || amount3 > 0) {
      let profit2 = parseFloat(((prediction_amount / (prediction_amount + amount2)) * (amount1 + amount3) * our_profit_factor).toFixed(4))
      $('#js-2-profit').text('(~ ' + parseFloat(profit2.toFixed(4)) + ' BNB)')
    }
    if (amount1 > 0 || amount2 > 0) {
      let profit3 = parseFloat(((prediction_amount / (prediction_amount + amount3)) * (amount1 + amount2) * our_profit_factor).toFixed(4))
      $('#js-3-profit').text('(~ ' + parseFloat(profit3.toFixed(4)) + ' BNB)')
    }
  })
})

async function predictionSuccess(prediction) {
  getAccount()

  getPredictionResult(null, prediction, async function (error, predictionsInfo) {
    showResults(predictionsInfo, 'show')
  })
}

async function predictionFaild() { }

async function showResults(predictionsInfo, mode = 'show') {
  $('.js-info-loading').addClass('d-none')
  let predictionInfo = predictionsInfo[0],
    predictionResult = predictionsInfo[1]

  if ('' === predictionResult.result) {
    if (predictionInfo.result > 0) {
      let amount = parseFloat(predictionInfo.amount) / etherValue
      $('.text-success').text('You bet ' + parseFloat(amount.toFixed(4)) + ' BNB on ' + ('1' === predictionInfo.result ? prediction.team1Title + ' to win' : '2' === predictionInfo.result ? prediction.team2Title + ' to win' : '3' === predictionInfo.result ? ' a draw between ' + prediction.team1Title + ' and ' + prediction.team2Title : 'nothing!'))
      $('#js-prediction-box-error-icon').addClass('d-none')
      $('#js-prediction-box-success-icon').removeClass('d-none')
      $('#js-predictioned-box').removeClass('d-none')
      $('#js-bet-question').text('How much BNB do you want to raise?')
      $('.js-result-option').prop('disabled', true)
      $('#js-result-option-' + predictionInfo.result).prop('disabled', false)
      $('#js-result-option-' + predictionInfo.result).prop('checked', true)
    } else {
      $('.js-result-option').prop('disabled', false)
    }
    if ('show' === mode) {
      $('#js-bet-wrapper').removeClass('d-none')

      if (prediction.started_at > 0) {
        $('#js-countdown-wrapper').removeClass('d-none');
      }

      timer = setInterval(function () {
        let remain_seconds = prediction.started_at - parseInt((new Date().getTime() / 1000))
        if (!(remain_seconds > 0)) {
          disableBet()
          clearInterval(timer)
          return true;
        }
        let days = parseInt(remain_seconds / 86400)
        remain_seconds -= days * 86400
        let hours = parseInt(remain_seconds / 3600)
        remain_seconds -= hours * 3600
        let minutes = parseInt(remain_seconds / 60)
        remain_seconds -= minutes * 60

        $('.countdown .js-days').text(days)
        $('.countdown .js-hours').text(hours)
        $('.countdown .js-minutes').text(minutes)
        $('.countdown .js-seconds').text(remain_seconds)
      }, 1000)
      $('#js-set-prediction').attr('data-prediction_key', prediction_key)
      $('#js-1-win').text(prediction.team1Title + ' Win')
      $('#js-2-win').text(prediction.team2Title + ' Win')
    } else if ('set' === mode) {

    }
  } else {
    disableBet();
  }

  if (remain_seconds > 1) {
    $('#js-set-prediction').removeClass('placeholder').prop('disabled', false)
  }
  let updated_amounts = [];
  let amount_timer = setInterval(function () {
    if (predictionResult.results.length === updated_amounts.length) {
      clearInterval(amount_timer)
      $('#js-other-predictions').removeClass('placeholder')
      $('input[name=prediction_amount]').trigger('change')
    }
  }, 1000)

  for (let result of predictionResult.results) {
    getAmount(null, prediction, result, function (predictionResultAmounts) {
      let the_amount = parseFloat((predictionResultAmounts[0] / etherValue).toFixed(4));
      $('#js-' + result + '-amount').text(
        the_amount + ' BNB',
      )
      $('#js-' + result + '-count').text(predictionResultAmounts[1])
      updated_amounts.push(the_amount)
    })
  }

}

async function setPrediction(prediction_key, prediction_result, prediction_amount, callback) {
  if (
    !(
      prediction_key.length &&
      prediction_result.length &&
      prediction_amount > 0
    )
  ) {
    console.log('wrong info')
    return false
  }

  getBalance(async function (balance) {
    $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')

    let value = 0
    prediction_amount = parseInt(prediction_amount * etherValue)
    if (balance < prediction_amount) {
      value = prediction_amount - balance
    }

    try {
      let config = { from: account }
      if (value > 0) {
        config.value = '' + value

        let gas = await contract.methods.setPrediction(prediction_key, '' + prediction_result, '' + prediction_amount).estimateGas(config)
        config.gas = '' + gas;
      }

      contract.methods
        .setPrediction(prediction_key, '' + prediction_result, '' + prediction_amount)
        .send(config)
        .then(function (tx) {
          console.log('tx', tx)
          getPredictionResult((true !== tx.status) ? tx : null, prediction_key, callback)
        }).catch(function (error) {
          getPredictionResult(getErrorObject(error), prediction_key, callback)
        })
    } catch (error) {
      getPredictionResult(getErrorObject(error), prediction_key, callback)
    }
  })
}

function disableBet() {
  $('#js-set-prediction').prop('disabled', true)
  $('.js-result-option').prop('disabled', true).prop('checked', false)
  $('#js-prediction-box-error-icon').addClass('d-none')
  $('#js-prediction-box-success-icon').addClass('d-none')
  $('.text-success').text('This bet is over!')
  $('.countdown').addClass('d-none')
  $('#js-predictioned-box').removeClass('d-none')
  $('#js-bet-wrapper').addClass('d-none')
}