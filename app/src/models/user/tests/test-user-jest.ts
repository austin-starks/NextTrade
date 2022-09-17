import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "@jest/globals";
import "dotenv/config";
import User from "..";
import DbHandler from "../../../services/db";
import { BrokerageEnum } from "../../../utils/enums";

const dbHandler = new DbHandler("test");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const EMAIL = "example@gmail.com";

describe("User Tests", () => {
  test("Can create an account without errors", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: EMAIL,
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: process.env.TRADIER_TOKEN,
          accountId: process.env.TRADIER_ACCOUNT_ID,
        },
      },
    };
    const user = new User(userInfo);
    expect(user.email).toEqual("example@gmail.com");
  });

  test("Can get a user by their email", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: EMAIL,
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: process.env.TRADIER_TOKEN,
          accountId: process.env.TRADIER_ACCOUNT_ID,
        },
      },
    };
    const user = new User(userInfo);
    await user.save();
    const dbUser = await User.findByEmail(EMAIL);
    expect(dbUser.email).toEqual(EMAIL);
  });

  test("Cannot get a non-existing user from db", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: EMAIL,
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: process.env.TRADIER_TOKEN,
          accountId: process.env.TRADIER_ACCOUNT_ID,
        },
      },
    };
    const user = new User(userInfo);
    await user.save();
    const NONEXISTING_EMAIL = "example123@gmail.com";
    try {
      await User.findByEmail(NONEXISTING_EMAIL);
      fail();
    } catch (err) {
      expect(err.message).toBe(
        `User with email '${NONEXISTING_EMAIL}' does not exist.`
      );
    }
  });

  test("Cannot create an account with an invalid email", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@ gmail.com",
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: process.env.TRADIER_TOKEN,
          accountId: process.env.TRADIER_ACCOUNT_ID,
        },
      },
    };
    const user = new User(userInfo);
    try {
      await user.save();
      fail();
    } catch (err) {
      expect(err).not.toBe(null);
    }
  });

  test("Cannot create an account with an existing email", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: process.env.TRADIER_TOKEN,
          accountId: process.env.TRADIER_ACCOUNT_ID,
        },
      },
    };
    const user = new User(userInfo);
    await user.save();

    const duplicateInfo = {
      password: "12345678",
      email: "example1@gmail.com",
      firstName: "John",
      lastName: "Doe",
      brokerage: {
        name: BrokerageEnum.TRADIER,
        authDetails: {
          token: process.env.TRADIER_TOKEN,
          accountId: process.env.TRADIER_ACCOUNT_ID,
        },
      },
    };
    const user2 = new User(duplicateInfo);
    try {
      await user2.save();
      fail("Should not be able to save the user");
    } catch (err) {
      expect(err).not.toBe(null);
    }
  });
});
