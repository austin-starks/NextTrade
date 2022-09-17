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

const dbHandler = new DbHandler("test");

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => await dbHandler.clearDatabase());

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe("Authentication Tests", () => {
  test("Can create an account without errors", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
    };
    const user = await User.create(userInfo);
    expect(user.email).toEqual("example@gmail.com");
  });

  test("Cannot create an account with an invalid email", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@ gmail.com",
    };
    try {
      await User.create(userInfo);
      fail("Should not reach this point");
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
    };
    await User.create(userInfo);
    const duplicateInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example1@gmail.com",
    };
    try {
      await User.create(duplicateInfo);
      fail();
    } catch (err) {
      expect(err).not.toBe(null);
    }
  });

  test("Can login using an email without errors", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
    };
    await User.create(userInfo);
    const user = await User.login(userInfo.email, userInfo.password);
    expect(user.email).toEqual("example@gmail.com");
  });

  test("Cannot login with incorrect credientials", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
    };
    await User.create(userInfo);
    try {
      await User.login(userInfo.email, "123456789");
      fail("Should not have logged in");
    } catch (err) {
      expect(err).not.toBe(null);
    }
  });

  test("Cannot login with non-existing user", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
    };
    await User.create(userInfo);
    try {
      await User.login("example1@gmail.com", "12345678");
    } catch (err) {
      expect(err).not.toBe(null);
    }
  });

  test("Can create a token for a user", async () => {
    const userInfo = {
      password: "12345678",
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "555-555-5555",
      email: "example@gmail.com",
    };
    const user = await User.create(userInfo);
    const token = await user.generateAuthToken();
    expect(token).not.toBe(null);
    const token2 = await user.generateAuthToken(true);
    expect(token2).not.toBe(null);
    expect(token).not.toEqual(token2);
  });
});
