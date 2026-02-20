const hre = require('hardhat');

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error('Aucun compte deployer trouvé. Vérifiez SBT_MINTER_PRIVATE_KEY dans .env');
  }

  console.log('Deployer:', deployer.address);

  const ownerAddress = process.env.SBT_OWNER_ADDRESS || deployer.address;
  const voucherSigner = process.env.SBT_VOUCHER_SIGNER_ADDRESS || deployer.address;

  const Factory = await ethers.getContractFactory('BacchaFestivalSBT');
  const contract = await Factory.deploy(ownerAddress, voucherSigner);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log('SBT deployed at:', contractAddress);
  console.log('Owner:', ownerAddress);
  console.log('Voucher signer:', voucherSigner);
  console.log('Update your .env with:');
  console.log(`SBT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`SBT_VOUCHER_SIGNER_PRIVATE_KEY=<private key of ${voucherSigner}>`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
