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
  abi = JSON.parse('[{"inputs":[{"internalType":"string","name":"key","type":"string"}],"name":"getRewards","outputs":[{"internalType":"string","name":"","type":"string"},{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewarded","type":"uint256"},{"internalType":"uint256","name":"updated_at","type":"uint256"}],"internalType":"struct TornoBet.Prediction","name":"","type":"tuple"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"key","type":"string"},{"internalType":"string","name":"prediction_result","type":"string"},{"internalType":"uint256","name":"prediction_amount","type":"uint256"}],"name":"setPrediction","outputs":[{"internalType":"string","name":"","type":"string"},{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewarded","type":"uint256"},{"internalType":"uint256","name":"updated_at","type":"uint256"}],"internalType":"struct TornoBet.Prediction","name":"","type":"tuple"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"subamount","type":"uint256"}],"name":"withdrawAll","outputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"key","type":"string"},{"internalType":"string","name":"result","type":"string"}],"name":"getAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPredictions","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"key","type":"string"}],"name":"predictionResult","outputs":[{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewarded","type":"uint256"},{"internalType":"uint256","name":"updated_at","type":"uint256"}],"internalType":"struct TornoBet.Prediction","name":"","type":"tuple"},{"components":[{"internalType":"string","name":"result","type":"string"},{"internalType":"string[]","name":"results","type":"string[]"},{"internalType":"uint256","name":"results_count","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"started_at","type":"uint256"}],"internalType":"struct TornoBet.PredictionResult","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}]'),
  contractAddress = '0x44F937248647bc8fa999F1639d7A8B9334345aCA'

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

  $(document).on('click', '#js-modal-link-metamask', function () {
    $(this).removeClass('text-start').addClass('text-center').html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>',
    )
    setCookie("connected_to", 'metamask', 365);
    // localStorage.setItem("connected_to", 'metamask');
    getWeb3('metamask', window[$('#js-sign-in').attr('success')], window[$('#js-sign-in').attr('failed')])
  });

  $(document).on('click', '#js-modal-link-wallet-connect', function () {
    $(this).removeClass('text-start').addClass('text-center').html(
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>',
    )
    setCookie("connected_to", 'wallet-connect', 365);
    // localStorage.setItem("connected_to", 'wallet-connect');
    getWeb3('wallet-connect', window[$('#js-sign-in').attr('success')], window[$('#js-sign-in').attr('failed')])
  });

  $(document).on('click', '#js-disconnect', function () {
    setCookie("connected_to", '', 1);
    $('#js-signed').addClass('d-none')
    $('#js-sign-in').removeClass('d-none')
  })

  $(document).on('click', '#js-modal-close, #theModal', function () {
    setTimeout(function () {
      if (!$('#theModal').hasClass('show')) {
        callModal({ status: 'hide' })
        $('#js-sign-in').html('<div>Connect Wallet</div>');
      }
    }, 2000)
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

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";SameSite=Lax;" + expires + ";path=/";
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

async function getWeb3(wallet_name, success, failed) {
  $('#js-sign-in').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
  // let connected_to = localStorage.getItem("connected_to");
  let connected_to = getCookie("connected_to");
  console.log('connected_to', connected_to)
  if ('metamask' === wallet_name || (null === wallet_name && 'metamask' === connected_to)) {
    if ('undefined' !== typeof window.ethereum) {
      console.log('window.ethereum')
      window.web3 = new Web3(window.ethereum)
      /*try {
        // Request account access if needed
        const accounts = await window.ethereum.send('eth_requestAccounts');
        // const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        // Accounts now exposed, use them
        window.ethereum.send('eth_sendTransaction', { from: accounts[0], ... })
      } catch (error) {
        // User denied account access
      }*/

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        $('#js-sign-in').html('<div>Connect Wallet</div>');
        if (accounts.length == 0) {
          setCookie("connected_to", '', 1);
          callModal({
            icon: true,
            text: 'No account found! Make sure the Ethereum client is configured properly.',
            status: 'show'
          })
          if (failed) {
            failed('No account found!')
          }
          return false
        }
        account = accounts[0]
        console.log('account', account)
        // detect account change
        window.ethereum.on('accountsChanged', function (accounts) {
          checkAccount(accounts)
        })
        // detect Network change
        window.ethereum.on('chainChanged', (chainId) => {
          checkNetwork(parseInt(chainId))
        })
      } catch (error) {
        console.log('error', error)
        setCookie("connected_to", '', 1);
        $('#js-sign-in').html('<div>Connect Wallet</div>');
        callModal({ status: 'hide' })
        if (failed) {
          failed('user rejected permission')
        }
        return false
      }
    }
  } else if ('wallet-connect' === wallet_name || (null === wallet_name && 'wallet-connect' === connected_to)) {
    const provider = new WalletConnectProvider.default({ rpc: { 56: "https://bsc-dataseed.binance.org/" } });
    try {
      await provider.enable()
      window.web3 = new Web3(provider)
      var accounts = await window.web3.eth.getAccounts()
      $('#js-sign-in').html('<div>Connect Wallet</div>');
      if (accounts.length == 0) {
        setCookie("connected_to", '', 1);
        callModal({
          icon: true,
          text: 'No account found! Make sure the Ethereum client is configured properly.',
          status: 'show'
        })
        if (failed) {
          failed('No account found!')
        }
        return false
      }
      account = accounts[0]
      console.log('account', account)
      provider.on("accountsChanged", (accounts) => {
        checkAccount(accounts)
      });
      provider.on("chainChanged", (chainId) => {
        checkNetwork(parseInt(chainId))
      });
    } catch (error) {
      console.log('error', error)
      setCookie("connected_to", '', 1);
      $('#js-sign-in').html('<div>Connect Wallet</div>');
      callModal({ status: 'hide' })
      if (failed) {
        failed('user rejected permission')
      }

      return false
    }
  } else {
    callModal({
      login: 'all',
      title: 'Connect Wallet',
      p: 'Choose how you want to connect. There are several wallet providers.',
      status: 'show'
    })
    return true;
  }

  /*if (window.web3) {
   console.log('window.web3')
   //window.web3 = new Web3(window.web3.currentProvider.enable())
   window.web3 = new Web3(window.eth.givenProvider || window.web3.currentProvider.enable())
   // no need to ask for permission
 } */

  if (window.web3) {
    console.log('web3 connected.')
    $('#js-sign-in').html('<div>Connect Wallet</div>');
    callModal({ status: 'hide' })
    if (!(await checkNetwork())) {
      return true
    }

    //contract instance
    // contract = window.ethereum.request({method: 'eth_requestAccounts', params: [account] }, abi, contractAddress);
    contract = new window.web3.eth.Contract(abi, contractAddress)
    // const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if (success) {
      success()
    }
  } else {
    callModal({
      login: 'wallet-connect',
      title: 'Connect Wallet',
      p: 'Choose how you want to connect. There are several wallet providers.',
      status: 'show'
    })
    if (failed) {
      failed('Non-Ethereum browser detected.')
    }
    return false
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
      return true
    }
  }

  $('#js-top-fixed-error').html(
    'Change the network to <strong>Binance Smart Chain</strong> mainnet!',
  )
  $('#js-top-fixed-error').removeClass('d-none')
  $('body').css('marginTop', $('#js-top-fixed-error').css('height'))
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
    }).catch(function (error) {
      console.log('error', error)
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
    }).catch(function (error) {
      console.log('error', error)
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
    }).catch(function (error) {
      callback(error, null)
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
      }).catch(function (error) {
        console.log('error', error)
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
  $('#js-sign-in').addClass('d-none')
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

    /*const transactionHash = await window.ethereum.request({
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
          }).catch(function (error) {
            if (callback) {
              callback(error)
            }
            return error
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

function callModal(config) {
  if ('undefined' !== typeof config.title) {
    $('#js-modal-title').text(config.title).removeClass('d-none')
  } else {
    $('#js-modal-title').text('').addClass('d-none')
  }

  $('#js-modal-image').addClass('d-none')
  if ('undefined' !== typeof config.image) {
    $('#js-modal-image').removeClass('d-none')
  } else {
    $('#js-modal-image').addClass('d-none')
  }

  if ('undefined' !== typeof config.icon) {
    $('#js-modal-icon').removeClass('d-none')
  } else {
    $('#js-modal-icon').addClass('d-none')
  }

  if ('undefined' !== typeof config.text) {
    $('#js-modal-text').text(config.text).removeClass('d-none')
  } else {
    $('#js-modal-text').addClass('d-none')
  }

  if ('undefined' !== typeof config.p) {
    $('#js-modal-p').text(config.p).removeClass('d-none')
  } else {
    $('#js-modal-p').text('').addClass('d-none')
  }

  if ('undefined' !== typeof config.login) {
    $('#modal-body').removeClass('text-center');
    if (('metamask' === config.login || 'all' === config.login) && 'undefined' !== typeof window.ethereum) {
      $('#js-modal-link-metamask').removeClass('d-none').removeClass('text-center').addClass('text-start').html('<img src="images/metamask.svg" width="24px" class="mx-1" alt=""><span>Metamask</span>')
    } else {
      $('#js-modal-link-metamask').addClass('d-none').removeClass('text-center').addClass('text-start').text('')
    }
    if ('wallet-connect' === config.login || 'all' === config.login) {
      $('#js-modal-link-wallet-connect').removeClass('d-none').removeClass('text-center').addClass('text-start').html('<img src="images/wallet-connect.svg" width="24px" class="mx-1" alt=""><span>Wallet Connect</span>')
    } else {
      $('#js-modal-link-wallet-connect').addClass('d-none').removeClass('text-center').addClass('text-start').text('')
    }
  } else {
    $('#modal-body').addClass('text-center');
    $('#js-modal-link-metamask').addClass('d-none').removeClass('text-center').addClass('text-start').text('')
    $('#js-modal-link-wallet-connect').addClass('d-none').removeClass('text-center').addClass('text-start').text('')
  }

  if ('undefined' !== typeof config.link) {
    $('#js-modal-link').text('undefined' !== typeof config.link.text ? config.link.text : '').removeClass('d-none').attr('href', 'undefined' !== typeof config.link.href ? config.link.href : '#')
  } else {
    $('#js-modal-link').addClass('d-none').text('').attr('href', '#')
  }

  if ('undefined' !== typeof config.status && 'show' === config.status) {
    $('#theModal').modal('show')
  } else {
    $('#theModal').modal('hide')
  }
}