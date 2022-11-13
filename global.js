var account, contract, predictions, predictionsByKey = {}, seconds, theToast, coinPrice = 0.0

const correctNetId = 97,
  etherValue = 1000000000000000000,
  min_qty = 0.01,
  step_qty = 0.01,
  step_precision = 2,
  our_profit_factor = 0.1,
  params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  }),
  abi = JSON.parse('[{"inputs":[{"internalType":"string","name":"key","type":"string"}],"name":"getRewards","outputs":[{"internalType":"string","name":"","type":"string"},{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewarded","type":"uint256"},{"internalType":"uint256","name":"updated_at","type":"uint256"}],"internalType":"struct TornoBet.Prediction","name":"","type":"tuple"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"key","type":"string"},{"internalType":"string","name":"prediction_result","type":"string"},{"internalType":"uint256","name":"prediction_amount","type":"uint256"}],"name":"setPrediction","outputs":[{"internalType":"string","name":"","type":"string"},{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewarded","type":"uint256"},{"internalType":"uint256","name":"updated_at","type":"uint256"}],"internalType":"struct TornoBet.Prediction","name":"","type":"tuple"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"subamount","type":"uint256"}],"name":"withdrawAll","outputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"key","type":"string"},{"internalType":"string","name":"result","type":"string"}],"name":"getAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPredictions","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"key","type":"string"}],"name":"predictionResult","outputs":[{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewarded","type":"uint256"},{"internalType":"uint256","name":"updated_at","type":"uint256"}],"internalType":"struct TornoBet.Prediction","name":"","type":"tuple"},{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"string[]","name":"results","type":"string[]"},{"internalType":"uint256","name":"results_count","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"started_at","type":"uint256"}],"internalType":"struct TornoBet.PredictionResult","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}]'),
  contractAddress = '0x00C5B32be757cA50DC20d2B479CC877B84833f2A'

$(document).ready(function () {
  // get the coin price  
  (async () => {
    let bnbPrice = await calcBNBPrice()
    if (parseFloat(bnbPrice) > 0) {
      coinPrice = parseFloat(bnbPrice)
    }
  })();

  theToast = new bootstrap.Toast($('#theToast'))

  $(document).on('click', '.qty-decrease', function () {
    let input = $(this).parent().find('input')
    let qty = (parseFloat(input.val()) - step_qty).toFixed(2)

    if (qty < min_qty) {
      qty = min_qty
    }

    input.val(qty)
    input.trigger('change')
  })

  $(document).on('click', '.qty-increase', function () {
    let input = $(this).parent().find('input')
    let qty = (parseFloat(input.val()) + step_qty).toFixed(2)

    input.val(qty)
    input.trigger('change')
  })

  $(document).on('click', '#js-not-signed', function () {
    $(this).addClass('placeholder')
    getWeb3(indexSuccess, indexFaild)
  })

  $(document).on('click', '#js-deposit', async function () {
    $('#js-withdraw').prop('disabled', true);
    $('#js-deposit').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>',
    )
    let input = $('#js-signed').find('input[name=qty]')
    let result = await depositValue(parseFloat(input.val()))
    $('#js-withdraw').prop('disabled', false);
    $('#js-deposit').text('Deposit').prop('disabled', false)
    if ('undefined' !== typeof result.code) {
      console.log('error', result)
    } else {
      getBalance(function (balance) {
        $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')
      })
    }
  })

  $(document).on('click', '#js-withdraw', async function () {
    $('#js-deposit').prop('disabled', true);
    $('#js-withdraw').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>',
    )
    $('#js-error-withdraw-wrapper').removeClass('d-none').addClass('d-none')
    let input = $('#js-signed').find('input[name=qty]')
    withdrawValue(parseFloat(input.val()), function (error) {
      $('#js-deposit').prop('disabled', false);
      $('#js-withdraw').text('Withdraw').prop('disabled', false)
      if ('value_over_balance' === error) {
        $('#js-error-withdraw-wrapper').removeClass('d-none')
      } else if (null !== error && 'undefined' !== typeof error.code) {
        console.log('error', error)
      } else {
        getBalance(function (balance) {
          $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')
        })
      }
    })
  })
})

async function getWeb3(success, failed) {
  // web3 provider with fallback for old version
  if ('undefined' !== typeof ethereum) {
    window.web3 = new Web3(ethereum)
    /*try {
      // Request account access if needed
      const accounts = await ethereum.send('eth_requestAccounts');
      // const accounts = await ethereum.request({ method: 'eth_accounts' });
      // Accounts now exposed, use them
      ethereum.send('eth_sendTransaction', { from: accounts[0], ... })
    } catch (error) {
      // User denied account access
    }*/

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length == 0) {
        $('#js-modal-image').addClass('d-none')
        $('#js-modal-icon').removeClass('d-none')
        $('#js-modal-text').html(
          'No account found! Make sure the Ethereum client is configured properly.',
        )
        $('#js-modal-link').addClass('d-none').text('').attr('href', '#')
        $('#theModal').modal('show')
        failed('No account found!')
        return false
      }
      account = accounts[0]
      console.log('account', account)
      // detect account change
      ethereum.on('accountsChanged', function (accounts) {
        checkAccount(accounts)
      })
      // detect Network change
      ethereum.on('chainChanged', (chainId) => {
        checkNetwork(parseInt(chainId))
      })
      // console.log(_metamask.isEnabled)
      //await _metamask.isApproved
      // user approved permission
    } catch (error) {
      console.log('error', error)
      // user rejected permission
      failed('user rejected permission')
      return false
    }
  } else {
    /*else if (window.web3) {
    //window.web3 = new Web3(window.web3.currentProvider.enable())
    window.web3 = new Web3(window.eth.givenProvider || window.web3.currentProvider.enable())
    // no need to ask for permission
  }*/
    $('#js-modal-image').addClass('d-none')
    $('#js-modal-icon').removeClass('d-none')
    $('#js-modal-text').html('Non-Ethereum browser detected.')
    $('#js-modal-link')
      .removeClass('d-none')
      .text('Download Metamask')
      .attr('href', 'https://metamask.io/download/')
    $('#theModal').modal('show')
    failed('Non-Ethereum browser detected.')
    return false
  }

  if (!(await checkNetwork())) {
    return true
  }

  //contract instance
  // contract = ethereum.request({method: 'eth_requestAccounts', params: [account] }, abi, contractAddress);
  contract = new window.web3.eth.Contract(abi, contractAddress)
  // const accounts = await ethereum.request({ method: 'eth_accounts' });

  if ('function' === typeof success) {
    success()
  }

  return false
}

//Smart contract functions

async function checkAccount(accounts) {
  window.location.reload()
}

async function checkNetwork(chainId) {
  let networkChanged = false
  if (!(chainId > 0)) {
    chainId = await window.web3.eth.net.getId()
  } else {
    networkChanged = true
  }

  if (correctNetId === chainId) {
    if (networkChanged) {
      window.location.reload()
    } else {
      $('#js-top-fixed-error').removeClass('d-none').addClass('d-none')
      $('body').css('marginTop', 0)
      // $('#theModal').modal('hide');
      return true
    }
  }

  $('#js-top-fixed-error').html(
    'Change the network to <strong>Binance Smart Chain</strong> mainnet!',
  )
  $('#js-top-fixed-error').removeClass('d-none')
  $('body').css('marginTop', $('#js-top-fixed-error').css('height'))
  /*$('#js-modal-icon').addClass('d-none');
  $('#js-modal-image').removeClass('d-none');
  $('#js-modal-text').html('Change the network to <br><span class="fw-bolder">Binance Smart Chain</span> mainnet!');
  $('#js-modal-link').addClass('d-none').text('').attr('href', '#');
  $('#theModal').modal('show');*/
}

async function getBalance(callback) {
  return contract.methods
    .balance()
    .call({ from: account })
    .then(function (balance) {
      console.log('balance', balance)
      if (callback) {
        callback(parseFloat(balance))
      }
      return balance
    })
}

async function getPredictions(callback) {
  return contract.methods
    .getPredictions()
    .call({ from: account })
    .then(function (myPredictions) {
      console.log('My Predictions', myPredictions)
      if (callback) {
        callback(myPredictions)
      }
      return myPredictions
    })
}

async function getPredictionResult(error, prediction, callback) {
  if (null !== error) {
    return callback(error, null)
  }

  let prediction_key = prediction
  if (undefined !== prediction.category) {
    prediction_key = prediction.category + '.' + prediction.type + '.' + prediction.group + '.' + prediction.team1 + '.' + prediction.team2
  }
  return contract.methods
    .predictionResult(prediction_key)
    .call({ from: account })
    .then(function (predictionsInfo) {
      console.log('The Predictions', predictionsInfo)
      if (callback) {
        callback(error, predictionsInfo)
      }
      return predictionsInfo
    })
}

async function getRewards(error, prediction, callback) {
  if (null !== error) {
    return callback(error)
  }

  let prediction_key = prediction
  if (undefined !== prediction.category) {
    prediction_key =
      prediction.category +
      '.' +
      prediction.type +
      '.' +
      prediction.group +
      '.' +
      prediction.team1 +
      '.' +
      prediction.team2
  }

  return contract.methods
    .getRewards(prediction_key)
    .send({ from: account })
    .on('receipt', function (receipt) {
      if (callback) {
        callback(null, receipt)
      }
      return receipt
    })
    .on('error', function (error, receipt) {
      if (callback) {
        callback(error, receipt)
      }
      return error
    })
}

async function getAmount(error, prediction, result, callback) {
  if (null !== error) {
    return callback(error)
  }

  let prediction_key = prediction
  if (undefined !== prediction.category) {
    prediction_key = prediction.category + '.' + prediction.type + '.' + prediction.group + '.' + prediction.team1 + '.' + prediction.team2
  }
  try {
    return contract.methods
      .getAmount(prediction_key, '' + result)
      .call({ from: account })
      .then(function (results) {
        console.log('Amount ' + result, results)
        if (callback) {
          callback(results)
        }
        return results
      })
  } catch (error) {
    console.log('error', error)
  }
}

function getAccount() {
  getBalance(function (balance) {
    $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')
  })
  let tmp = account
  tmp = tmp.replace(tmp.substring(9, account.length - 4), ' ... ')
  $('.js-wallet-code').html(tmp)
  $('.js-wallet-code').attr('title', account)
  $('#js-not-signed').addClass('d-none').removeClass('placeholder')
  $('#js-signed').removeClass('d-none')
  window.web3.eth.defaultAccount = account
}

async function depositValue(value, callback) {
  if (!(value > 0)) {
    return false
  }
  try {
    value *= etherValue
    return await web3.eth
      .sendTransaction({
        from: account,
        to: contractAddress,
        value: '' + value,
      })
      .on('receipt', function (receipt) {
        if (callback) {
          callback(null, receipt)
        }
        return receipt
      })
      .on('error', function (error, receipt) {
        if (callback) {
          callback(error, receipt)
        }
        return error
      })

    /*const transactionHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          to: contractAddress,
          'from': account,
          value: ''+value,
          gas:'0x2710'
        },
      ],
    });
    // Handle the result
    console.log(transactionHash);
    return transactionHash;*/
  } catch (error) {
    if (callback) {
      callback(error)
    }
    return error
  }
}

async function withdrawValue(value, callback) {
  if (!(value > 0)) {
    if (callback) {
      callback(false)
    }
    return false
  }
  try {
    return getBalance(async function (balance) {
      $('.js-balance').text(parseFloat((balance / etherValue).toFixed(4)) + ' BNB')
      value *= etherValue
      if (parseInt(value) > parseInt(balance)) {
        if (callback) {
          callback('value_over_balance')
        }
        return 'value_over_balance'
      }

      try {
        return await contract.methods
          .withdrawAll('' + value)
          .send({ from: account })
          .then(function (tx) {
            if (callback) {
              callback((true !== tx.status) ? tx : null)
            }
            return tx
          })
      } catch (error) {
        if (callback) {
          callback(error)
        }
        return error
      }
    })
  } catch (error) {
    if (callback) {
      callback(error)
    }
    return error
  }
}
