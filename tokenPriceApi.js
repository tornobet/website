let pancakeSwapAbi = [{ "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }, { "internalType": "address[]", "name": "path", "type": "address[]" }], "name": "getAmountsOut", "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" },];
let tokenAbi = [{ "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },];

let pancakeSwapContract = "0x10ED43C718714eb63d5aA57B78B54704E256024E".toLowerCase();
const oweb3 = new Web3("https://bsc-dataseed.binance.org/");
async function calcSell(tokensToSell, tokenAddress) {
    const oweb3 = new Web3("https://bsc-dataseed.binance.org/");
    const BNBTokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" //BNB

    let tokenRouter = await new oweb3.eth.Contract(tokenAbi, tokenAddress);
    let tokenDecimals = await tokenRouter.methods.decimals().call();

    tokensToSell = setDecimals(tokensToSell, tokenDecimals);
    let amountOut;
    try {
        let router = await new oweb3.eth.Contract(pancakeSwapAbi, pancakeSwapContract);
        amountOut = await router.methods.getAmountsOut(tokensToSell, [tokenAddress, BNBTokenAddress]).call();
        amountOut = oweb3.utils.fromWei(amountOut[1]);
    } catch (error) { }

    if (!amountOut) return 0;
    return amountOut;
}
async function calcBNBPrice() {
    const oweb3 = new Web3("https://bsc-dataseed.binance.org/");
    const BNBTokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" //BNB
    const USDTokenAddress = "0x55d398326f99059fF775485246999027B3197955" //USDT
    let bnbToSell = oweb3.utils.toWei("1", "ether");
    let amountOut;
    try {
        let router = await new oweb3.eth.Contract(pancakeSwapAbi, pancakeSwapContract);
        amountOut = await router.methods.getAmountsOut(bnbToSell, [BNBTokenAddress, USDTokenAddress]).call();
        amountOut = oweb3.utils.fromWei(amountOut[1]);
    } catch (error) { }
    if (!amountOut) return 0;
    return amountOut;
}
function setDecimals(number, decimals) {
    number = number.toString();
    let numberAbs = number.split('.')[0]
    let numberDecimals = number.split('.')[1] ? number.split('.')[1] : '';
    while (numberDecimals.length < decimals) {
        numberDecimals += "0";
    }
    return numberAbs + numberDecimals;
}
// example
/*(async () => {
    const tokenAddress = '0xa49e44976c236beb51a1f818d49b9b9759ed97b1'; // change this with the token addres that you want to know the 
    let bnbPrice = await calcBNBPrice() // query pancakeswap to get the price of BNB in USDT
    if (bnbPrice > 0) {
        coinPrice = bnbPrice
    }
    console.log(`CURRENT BNB PRICE: ${bnbPrice}`);
    // Them amount of tokens to sell. adjust this value based on you need, you can encounter errors with high supply tokens when this value is 1.
    let tokens_to_sell = 1;
    let priceInBnb = await calcSell(tokens_to_sell, tokenAddress) / tokens_to_sell; // calculate TOKEN price in BNB
    console.log('SHIT_TOKEN VALUE IN BNB : ' + priceInBnb + ' | Just convert it to USD ');
    console.log(`SHIT_TOKEN VALUE IN USD: ${priceInBnb * bnbPrice}`); // convert the token price from BNB to USD based on the retrived BNB value
})();*/