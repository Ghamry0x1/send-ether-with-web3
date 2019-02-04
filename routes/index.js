require('dotenv').config();
const express = require('express');
const router = express.Router();
const Web3 = require('web3');
const axios = require('axios');
const EthereumTx = require('ethereumjs-tx');
const log = require('ololog').configure({ time: true });
const ansi = require('ansicolor').nice;

const testnet = `https://ropsten.infura.io/${process.env.INFURA_ACCESS_TOKEN}`;
const web3 = new Web3(new Web3.providers.HttpProvider(testnet));

const getCurrentGasPrices = async () => {
  let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json')
  
  let prices = {
    low: response.data.safeLow / 10,
    medium: response.data.average / 10,
    high: response.data.fast / 10
  }

  console.log("\r\n")
  log(`Current ETH Gas Prices (in GWEI):`.cyan)
  console.log("\r\n")
  log(`Low: ${prices.low} (transaction completes in < 30 minutes)`.green)
  log(`Standard: ${prices.medium} (transaction completes in < 5 minutes)`.yellow)
  log(`Fast: ${prices.high} (transaction completes in < 2 minutes)`.red)
  console.log("\r\n")

  return prices
}

const send_ether_with_web3 = async (userWalletAddress, userWalletPK, amountToSend) => {
  web3.eth.defaultAccount = userWalletAddress;

  const myBalanceWei = web3.eth.getBalance(web3.eth.defaultAccount).toNumber();
  const myBalance = web3.fromWei(myBalanceWei, 'ether');

  log(`Your wallet balance is currently ${myBalance} ETH`.green);

  const nonce = web3.eth.getTransactionCount(web3.eth.defaultAccount);

  log(
    `The outgoing transaction count for your wallet address is: ${nonce}`
      .magenta
  );

  let gasPrices = await getCurrentGasPrices();

  let details = {
    to: process.env.CONTRACT_WALLET_ADDRESS,
    value: web3.toHex(web3.toWei(amountToSend, 'ether')),
    gas: 21000,
    gasPrice: gasPrices.low * 1000000000, // converts the gwei price to wei
    nonce: nonce,
    chainId: 3 // EIP 155 chainId - mainnet: 1, rinkeby: 4, ropsten: 3
  };

  const transaction = new EthereumTx(details);
  try{
    transaction.sign(Buffer.from(userWalletPK, 'hex'));
  }
  catch(err) {
    console.log(err);
  }

  const serializedTransaction = transaction.serialize();

  const transactionId = web3.eth.sendRawTransaction(
    '0x' + serializedTransaction.toString('hex')
  );

  const url = `https://ropsten.etherscan.io/tx/${transactionId}`;

  log(url.cyan);
  log(
    `Note: please allow for 30 seconds before transaction appears on Etherscan`
      .magenta
  );
  // process.exit();
};

router.get('/', function(req, res, next) {
  res.send('please use /api/v1 to make api calls');
});

router.post('/buyToken', function(req, res, next) {
  try{
    send_ether_with_web3(req.body.userWalletAddress, req.body.userWalletPK, req.body.amountToSend);
    res.status(200).send('Correct Operation');
  }
  catch(err) {
    console.log(err);
    res.status(500).send('Error');
  }
});

module.exports = router;
