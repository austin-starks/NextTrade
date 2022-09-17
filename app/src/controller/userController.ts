import Portfolio from "../models/portfolio";
import User from "../models/user";
import { debug, Request, Response } from "../utils";
import ForwardTest from "./forwardtestController";
import { LoginRequest, RegistrationRequest } from "./types";

class UserController {
  handleRegistrationErrors = (error: any): [number, string] => {
    if (error.name === "MongoError" && error.keyValue.email) {
      return [400, "Email already exists"];
    } else if (error.name === "MongoError") {
      return [400, "Username already exists"];
    } else if (error.name === "ValidatorError") {
      return [400, "Invalid Username"];
    } else if (error.name === "MongoError" && error.keyValue.phoneNumber) {
      return [400, "Phone number already registered"];
    } else {
      return [400, "Undefined error"];
    }
  };

  login = async (req: LoginRequest, res: Response) => {
    try {
      const { email, password, remember } = req.body;
      const user = await User.login(email, password);
      if (!user)
        return res
          .status(401)
          .json({ message: "Your email/password combination was not found." });
      const token = await user.generateAuthToken(remember);
      let cookieMaxAge = 1 * 24 * 60 * 60 * 1000;
      cookieMaxAge = remember ? cookieMaxAge * 14 : cookieMaxAge;
      res.cookie("jwt", token, {
        maxAge: cookieMaxAge,
        secure: process.env.NODE_ENV !== "development",
      });
      res.status(200).json({ message: "Authentication succeeded" });
    } catch (err) {
      debug(err);
      res
        .status(400)
        .json({ message: "Your email/password combination was not found." });
    }
  };

  register = async (req: RegistrationRequest, res: Response) => {
    let user: User;
    let error = false;
    try {
      const userInfo = req.body;
      user = await User.create(userInfo);
      const portfolio = await Portfolio.createInitialPortfolio(user.id);
      await portfolio.initializeHistory();

      const token = await user.generateAuthToken(userInfo.remember);
      let cookieMaxAge = 1 * 24 * 60 * 60 * 1000;
      cookieMaxAge = userInfo.remember ? cookieMaxAge * 14 : cookieMaxAge;
      res.cookie("jwt", token, {
        maxAge: cookieMaxAge,
        secure: process.env.NODE_ENV !== "development",
      });
      res.status(201).json({ message: "User created successfully" });
    } catch (e) {
      error = true;
      const [statusCode, errMsg] = this.handleRegistrationErrors(e);
      debug(e);
      res.status(statusCode).json({ message: errMsg });
    }
    if (!error) {
      ForwardTest.createWorker(user);
    }
  };

  logout = async (_req: Request, res: Response) => {
    try {
      res.clearCookie("jwt");
      res.status(200).json({ message: "User successfully logged out" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
}

export default new UserController();
