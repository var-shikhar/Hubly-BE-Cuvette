import express from "express";
import authController from "../controller/auth.js";
import isAuth from "../middleware/isAuthenticated.js";

const router = express.Router();

// Register Controller
router.route('/register').post(authController.postRegister)
router.route('/login').post(authController.postLogin);
router.route('/logout').get(isAuth, authController.getLogout);

// User Controller (Settings, Availability and Profile)
router.route('/user').get(isAuth, authController.getMemberList).post(isAuth, authController.postMember);
router.route('/user/:memberID').get(isAuth, authController.getMemberDetail).put(isAuth, authController.putMemberDetail).delete(isAuth, authController.deleteMember);

export default router;
