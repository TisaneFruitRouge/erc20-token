import { network } from "hardhat";

const { ethers } = await network.connect();

const Token = await ethers.getContractFactory("Token");
const token = await Token.deploy("MyToken", "MTK");
await token.waitForDeployment();

console.log("Token deployed to:", await token.getAddress());
