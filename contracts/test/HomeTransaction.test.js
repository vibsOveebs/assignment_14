const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('HomeTransaction', function () {
  async function deploy({ priceEth = '10', feeEth = '1' } = {}) {
    const [realtor, seller, buyer, other] = await ethers.getSigners();

    const HomeTransaction = await ethers.getContractFactory('HomeTransaction', realtor);
    const price = ethers.utils.parseEther(priceEth);
    const realtorFee = ethers.utils.parseEther(feeEth);

    const tx = await HomeTransaction.deploy(
      '123 Main St',
      '94107',
      'SF',
      realtorFee,
      price,
      realtor.address,
      seller.address,
      buyer.address
    );
    await tx.deployed();

    return { home: tx, realtor, seller, buyer, other, price, realtorFee };
  }

  it('happy path: seller signs, buyer deposits, realtor accepts, buyer finalizes', async function () {
    const { home, seller, buyer, realtor, price, realtorFee } = await deploy({ priceEth: '10', feeEth: '1' });

    await home.connect(seller).sellerSignContract();

    const deposit = price.mul(10).div(100);

    await home.connect(buyer).buyerSignContractAndPayDeposit({ value: deposit });
    await home.connect(realtor).realtorReviewedClosingConditions(true);

    const remainder = price.sub(deposit);

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    const realtorBalBefore = await ethers.provider.getBalance(realtor.address);

    await home.connect(buyer).buyerFinalizeTransaction({ value: remainder });

    const sellerBalAfter = await ethers.provider.getBalance(seller.address);
    const realtorBalAfter = await ethers.provider.getBalance(realtor.address);

    expect(sellerBalAfter.sub(sellerBalBefore).toString()).to.equal(price.sub(realtorFee).toString());
    expect(realtorBalAfter.sub(realtorBalBefore).toString()).to.equal(realtorFee.toString());
    expect(await home.contractState()).to.equal(4); // Finalized
  });

  it('withdrawal: after deadline anyone can trigger; realtor fee is capped to deposit', async function () {
    // price 10 ETH, fee 3 ETH, deposit is 1 ETH (10%) => fee > deposit
    const { home, seller, buyer, realtor, other, price } = await deploy({ priceEth: '10', feeEth: '3' });

    await home.connect(seller).sellerSignContract();
    const deposit = price.mul(10).div(100);
    await home.connect(buyer).buyerSignContractAndPayDeposit({ value: deposit });
    await home.connect(realtor).realtorReviewedClosingConditions(true);

    // move time forward past deadline
    await ethers.provider.send('evm_increaseTime', [6 * 60]);
    await ethers.provider.send('evm_mine');

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    const realtorBalBefore = await ethers.provider.getBalance(realtor.address);

    await home.connect(other).anyWithdrawFromTransaction();

    const sellerBalAfter = await ethers.provider.getBalance(seller.address);
    const realtorBalAfter = await ethers.provider.getBalance(realtor.address);

    // fee capped to deposit, so seller gets 0 and realtor gets deposit
    expect(sellerBalAfter.sub(sellerBalBefore)).to.equal(0);
    expect(realtorBalAfter.sub(realtorBalBefore)).to.equal(deposit);
    expect(await home.contractState()).to.equal(5); // Rejected
  });
});
