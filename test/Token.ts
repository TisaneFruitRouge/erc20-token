import { expect } from "chai";
import { network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Token } from "../typechain-types/contracts/Token.js";

const { ethers } = await network.connect();

describe("Token", () => {
  let token: Token;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    token = await ethers.deployContract("Token", [NAME, SYMBOL]);
  });

  describe("Deployment", () => {
    it("Should set the correct name and symbol", async () => {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("Should have 18 decimals", async () => {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should assign the total supply to the owner", async () => {
      expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    });

    it("Should set the correct total supply", async () => {
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should grant all roles to the deployer", async () => {
      const OWNER_ROLE = await token.OWNER_ROLE();
      const MINTER_ROLE = await token.MINTER_ROLE();
      const BURNER_ROLE = await token.BURNER_ROLE();

      expect(await token.roles(OWNER_ROLE, owner.address)).to.be.true;
      expect(await token.roles(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.roles(BURNER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Transfers", () => {
    it("Should transfer tokens between accounts", async () => {
      const amount = 100n;
      await token.transfer(addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(
        TOTAL_SUPPLY - amount
      );
    });

    it("Should emit Transfer event", async () => {
      const amount = 100n;
      await expect(token.transfer(addr1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, amount);
    });

    it("Should fail if sender has insufficient balance", async () => {
      await expect(
        token.connect(addr1).transfer(owner.address, 1n)
      ).to.be.revertedWith("Insufficient funds");
    });

    it("Should fail when transferring to the zero address", async () => {
      await expect(token.transfer(ethers.ZeroAddress, 100n)).to.be.revertedWith(
        "Transfer address is not valid"
      );
    });
  });

  describe("Allowances", () => {
    it("Should approve and return correct allowance", async () => {
      const amount = 500n;
      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(
        amount
      );
    });

    it("Should emit Approval event", async () => {
      const amount = 500n;
      await expect(token.approve(addr1.address, amount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, amount);
    });

    it("Should transferFrom with allowance", async () => {
      const amount = 200n;
      await token.approve(addr1.address, amount);
      await token
        .connect(addr1)
        .transferFrom(owner.address, addr2.address, amount);

      expect(await token.balanceOf(addr2.address)).to.equal(amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0n);
    });

    it("Should fail transferFrom without sufficient allowance", async () => {
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, 100n)
      ).to.be.revertedWith("Allowance is too small");
    });

    it("Should increase allowance", async () => {
      await token.approve(addr1.address, 100n);
      await token.increaseAllowance(addr1.address, 50n);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(
        150n
      );
    });

    it("Should decrease allowance", async () => {
      await token.approve(addr1.address, 100n);
      await token.decreaseAllowance(addr1.address, 30n);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(70n);
    });

    it("Should fail to decrease allowance below zero", async () => {
      await token.approve(addr1.address, 50n);
      await expect(
        token.decreaseAllowance(addr1.address, 100n)
      ).to.be.revertedWith("Remaining allowance is too small");
    });
  });

  describe("Minting", () => {
    it("Should allow minter to mint tokens", async () => {
      const amount = 1000n;
      await token.mint(addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY + amount);
    });

    it("Should emit Transfer event on mint", async () => {
      const amount = 1000n;
      await expect(token.mint(addr1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, amount);
    });

    it("Should fail if non-minter tries to mint", async () => {
      await expect(
        token.connect(addr1).mint(addr1.address, 1000n)
      ).to.be.revertedWith("You don't have permission to perform this action");
    });
  });

  describe("Burning", () => {
    it("Should allow burner to burn tokens", async () => {
      const amount = 1000n;
      await token.burn(owner.address, amount);

      expect(await token.balanceOf(owner.address)).to.equal(
        TOTAL_SUPPLY - amount
      );
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY - amount);
    });

    it("Should emit Transfer event on burn", async () => {
      const amount = 1000n;
      await expect(token.burn(owner.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, ethers.ZeroAddress, amount);
    });

    it("Should fail if non-burner tries to burn", async () => {
      await expect(
        token.connect(addr1).burn(owner.address, 1000n)
      ).to.be.revertedWith("You don't have permission to perform this action");
    });

    it("Should fail if burning more than balance", async () => {
      await expect(
        token.burn(owner.address, TOTAL_SUPPLY + 1n)
      ).to.be.revertedWith("Not enough coins to burn");
    });
  });

  describe("Roles", () => {
    it("Should allow owner to grant roles", async () => {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.grantRole(addr1.address, MINTER_ROLE);

      expect(await token.roles(MINTER_ROLE, addr1.address)).to.be.true;
    });

    it("Should emit RoleChanged event on grant", async () => {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await expect(token.grantRole(addr1.address, MINTER_ROLE))
        .to.emit(token, "RoleChanged")
        .withArgs(addr1.address, MINTER_ROLE, false);
    });

    it("Should allow owner to revoke roles", async () => {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.grantRole(addr1.address, MINTER_ROLE);
      await token.revokeRole(addr1.address, MINTER_ROLE);

      expect(await token.roles(MINTER_ROLE, addr1.address)).to.be.false;
    });

    it("Should prevent non-owner from granting roles", async () => {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await expect(
        token.connect(addr1).grantRole(addr2.address, MINTER_ROLE)
      ).to.be.revertedWith("You don't have permission to perform this action");
    });

    it("Should prevent owner from revoking their own OWNER_ROLE", async () => {
      const OWNER_ROLE = await token.OWNER_ROLE();
      await expect(
        token.revokeRole(owner.address, OWNER_ROLE)
      ).to.be.revertedWith("Cannot revoke own owner role");
    });
  });
});
