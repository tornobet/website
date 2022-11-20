$(document).ready(function () {
  $.getJSON('./info.json', function () { }).done(function (data) {
    predictions = data.predictions
    // predictions[0].started_at = parseInt((new Date().getTime() / 1000) + 4)
    let predictionsHTML = ''
    for (let i in predictions) {
      let prediction = predictions[i]
      if ('canceled' === prediction.status) {
        continue;
      }
      prediction.remain_seconds = parseInt(prediction.started_at) - parseInt((new Date().getTime() / 1000))
      let prediction_key = prediction.category + '.' + prediction.type + '.' + prediction.group + '.' + prediction.team1 + '.' + prediction.team2;
      predictionsByKey[prediction_key] = prediction;
      predictionsHTML +=
        '<div class="col-lg-4 col-md-6" id="js-prediction-' + i + '-wrapper">\
      <div class="prediction-box">\
          <div class="d-flex justify-content-between">\
              <img src="images/flags/' + prediction.team1 + '-thumb.png" alt="' + prediction.team1Title + ' flag" class="flag">\
              <div class="text-center">\
                  <div class="small">' + prediction.groupTitle + '</div>\
                  <div class="fw-bolder">' + prediction.team1 + ' - ' + prediction.team2 + '</div>\
              </div>\
              <img src="images/flags/' + prediction.team2 + '-thumb.png" alt="' + prediction.team2Title + ' flag" class="flag">\
          </div>\
          <div class="d-flex justify-content-center countdown text-center js-counter' + i + '">';
      if (prediction.remain_seconds > 0 && 'active' === prediction.status) {
        predictionsHTML += '\
              <div>\
                  <div class="countdown-value js-days"></div>\
                  <div class="countdown-unit">days</div>\
              </div>\
              <div>\
                  <div class="countdown-value js-hours"></div>\
                  <div class="countdown-unit">hours</div>\
              </div>\
              <div>\
                  <div class="countdown-value js-minutes"></div>\
                  <div class="countdown-unit">minutes</div>\
              </div>\
              <div>\
                  <div class="countdown-value js-seconds"></div>\
                  <div class="countdown-unit">seconds</div>\
              </div>\
            </div>\
            <div class="d-grid mt-3">\<a href="prediction.html?key=' + prediction_key + '" class="btn btn-primary js-prediction" data-index="' + i + '">Predict Now</a></div>\
          </div>\
        </div>'
      } else {
        predictionsHTML += '\
            <div>\
              <div class="countdown-value js-days">This bet is over!</div>\
              <div class="countdown-unit">&nbsp;</div>\
            </div>\
          </div>\
            <div class="d-grid mt-3">\<a href="prediction.html?key=' + prediction_key + '" class="btn btn-outline-primary js-prediction" data-index="' + i + '">Show Predictions</a></div>\
          </div>\
        </div>'
      }
    }
    $('#predictions').append(predictionsHTML)

    setInterval(function () {
      for (let i in predictions) {
        if ('active' === predictions[i].status) {
          let remain_seconds = parseInt(predictions[i].started_at) - parseInt((new Date().getTime() / 1000))
          if (!(remain_seconds >= 0)) {
            continue
          } else if (0 === remain_seconds) {
            betTimeout(i)
            continue
          }
          let days = parseInt(remain_seconds / 86400)
          remain_seconds -= days * 86400
          let hours = parseInt(remain_seconds / 3600)
          remain_seconds -= hours * 3600
          let minutes = parseInt(remain_seconds / 60)
          remain_seconds -= minutes * 60

          $('.js-counter' + i + ' .js-days').text(days)
          $('.js-counter' + i + ' .js-hours').text(hours)
          $('.js-counter' + i + ' .js-minutes').text(minutes)
          $('.js-counter' + i + ' .js-seconds').text(remain_seconds)
        }
      }
    }, 1000);
  })

  $(document).on('change', 'input[name=qty]', function () {
    let qty = parseFloat($(this).val())
    if (qty < min_qty) {
      qty = min_qty
      $(this).val(qty)
    }
  })

  $(document).on('click', '.js-release', function () {
    let thisObj = $(this);
    thisObj.prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>',
    )
    let prediction_key = $(this).data('prediction-key')
    getRewards(null, prediction_key, function (error, result) {
      thisObj.prop('disabled', false)
      if (result) {
        getPredictionResult(null, prediction_key, async function (error, predictionsInfo) {
          let predictionInfo = predictionsInfo[0]
          if ('2' === predictionInfo.rewarded) {
            thisObj.parent().text('Lost before!')
          } else if (0 == predictionInfo.amount) {
            thisObj.parent().text('Released')
            getBalance(function (balance) {
              $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')
            })
          }
        })
      } else {
        thisObj.text('Release!')
      }
    })
  })
  $(document).on('click', '#js-sign-in', function () {
    getWeb3(null, indexSuccess, indexFaild)
  })

  $('#js-sign-in').click();
})

async function indexSuccess() {
  $('#js-dashboard-wrapper').removeClass('d-none')
  getAccount()

  getPredictions(function (myPredictions) {
    let myPredictionsHTML = ''
    $('.js-info-loading').addClass('d-none')
    if (myPredictions.length) {
      for (let i in myPredictions) {
        prediction_key = myPredictions[i]
        let prediction_class = prediction_key.replaceAll('.', '-')
        prediction_key_parted = prediction_key.split('.')
        myPredictionsHTML += '<div class="d-flex row-border align-items-center js-prediction-item js-' + prediction_class + '">\
            <a class="col-5 d-md-flex" href="prediction.html?key=' + prediction_key + '">\
              <div class="d-flex align-items-center mr-4">\
                  <img class="flag-small" src="images/flags/' + prediction_key_parted[3] + '-thumb.png" alt="">\
                  <div>' + prediction_key_parted[3] + ('undefined' !== typeof predictionsByKey[prediction_key].result ? ' (' + predictionsByKey[prediction_key].result.team1 + ')' : '') + '</div>\
              </div>\
              <div class="d-flex align-items-center justify-content-sm-start md-mb-4">\
                  <img class="flag-small ml-4" src="images/flags/' + prediction_key_parted[4] + '-thumb.png" alt="">\
                  <div>' + prediction_key_parted[4] + ('undefined' !== typeof predictionsByKey[prediction_key].result ? ' (' + predictionsByKey[prediction_key].result.team2 + ')' : '') + '</div>\
              </div>\
            </a>\
          <div class="col-4 js-prediction-result">\
              <div class="js-prediction-predicted"></div>\
              <div class="fw-bolder js-prediction-status"></div>\
          </div>\
          <div class="col-3 d-md-flex text-end align-items-center js-prediction-operations"></div>\
      </div>'
      }
      $('#js-my-predictions-title').removeClass('d-none')
      $('#js-my-predictions-title').after(myPredictionsHTML)
    } else {
      $('#js-empty-dashboard').removeClass('d-none')
    }

    let updated_ats = [];
    let sort_timer = setInterval(function () {
      if (myPredictions.length === updated_ats.length) {
        clearInterval(sort_timer)
        updated_ats = updated_ats.sort().reverse()
        let sorted_list = '';
        for (let updated_at of updated_ats) {
          sorted_list += $('#js-dashboard-box').find('.js-updated-at-' + updated_at).prop('outerHTML')
        }
        $('#js-dashboard-box').find('.js-prediction-item').remove();
        $('#js-dashboard-box').append(sorted_list)
      }
    }, 1000)

    for (let prediction_key of myPredictions) {
      getPredictionResult(null, prediction_key, async function (error, predictionsInfo) {
        let predictionInfo = predictionsInfo[0]
        let predictionResult = predictionsInfo[1]

        let prediction_class = prediction_key.replaceAll('.', '-')
        let prediction_key_parted = prediction_key.split('.')

        let predictionWrapper = $('.js-' + prediction_class)
        let predictionOperations = $('.js-' + prediction_class).find('.js-prediction-operations')
        let predictionStatus = $('.js-' + prediction_class).find('.js-prediction-status')
        let predictionPredicted = $('.js-' + prediction_class).find('.js-prediction-predicted')

        predictionWrapper.addClass('js-updated-at-' + predictionInfo.updated_at)

        predictionPredicted.text(parseFloat(parseFloat(predictionInfo.amount / etherValue).toFixed(4)) + ' on ' + ('1' === predictionInfo.result ? prediction_key_parted[3] : '2' === predictionInfo.result ? prediction_key_parted[4] : '3' === predictionInfo.result ? 'Draw' : 'nothing!'))

        let status = 'pending',
          released = false,
          predictionOperationsHTML = ''
        if ('0' !== predictionInfo.rewarded) {
          released = true
        }

        if ('' !== predictionResult.result) {
          if ('4' === predictionResult.result) {
            status = 'canceled'
            predictionStatus.text('Canceled')
            if (!released) {
              predictionOperationsHTML =
                '<div class="flex-fill js-prediction-amount">' + parseFloat(parseFloat(predictionInfo.amount / etherValue).toFixed(4)) + '</div>\
                <div class="flex-fill js-prediction-release">\
                  <button type="button" class="btn btn-outline-primary btn-sm js-release" data-prediction-key="' + prediction_key + '">Release</button>\
                </div>'
            } else {
              predictionOperationsHTML =
                '<div class="flex-fill js-prediction-amount"></div>\
                <div class="flex-fill js-prediction-release">Released</div>'
            }
          } else if (predictionResult.result === predictionInfo.result) {
            status = 'won'
            let predictionResultAmounts = await getAmount(
              null,
              prediction_key,
              predictionInfo.result,
            )
            let profit = parseInt(predictionInfo.amount) + (parseInt(predictionResult.amount) - parseInt(predictionResultAmounts[0])) * parseInt(predictionInfo.amount) / parseInt((predictionResultAmounts[0]))
            predictionStatus.text('Won!')
            if (!released) {
              predictionOperationsHTML =
                '<div class="flex-fill js-prediction-amount">' + parseFloat(parseFloat(profit / etherValue).toFixed(4)) + '</div>\
                <div class="flex-fill js-prediction-release">\
                  <button type="button" class="btn btn-outline-primary btn-sm js-release" data-prediction-key="' + prediction_key + '">Release</button>\
              </div>'
            } else {
              predictionOperationsHTML =
                '<div class="flex-fill js-prediction-amount"></div>\
              <div class="flex-fill js-prediction-release">Released</div>'
            }
          } else {
            status = 'lost'
            predictionStatus.text('Lost!')
            predictionOperationsHTML =
              '<div class="flex-fill js-prediction-amount">- ' + parseFloat(parseFloat(predictionInfo.amount / etherValue).toFixed(4)) + '</div>'
          }
        } else {
          predictionStatus.text('Pending')
          predictionOperationsHTML =
            '<div class="flex-fill js-prediction-amount">' + parseFloat(parseFloat(predictionInfo.amount / etherValue).toFixed(4)) + '</div>'
        }

        predictionOperations.addClass('js-' + status).html(predictionOperationsHTML)
        updated_ats.push(predictionInfo.updated_at)
      })
      // return true;
    }
  })
}

async function indexFaild(error) {

}

function betTimeout(i) {
  let prediction_wraper = $('#js-prediction-' + i + '-wrapper')
  prediction_wraper
    .find('.js-prediction')
    .removeClass('btn-primary')
    .addClass('btn-outline-primary')
    .text('Show Predictions')
  prediction_wraper
    .find('.countdown')
    .html(
      '<div>\
    <div class="countdown-value js-days">This bet is over!</div>\
    <div class="countdown-unit">&nbsp;</div>\
  </div>',
    )
}
