/*
|---------------------------------------------------------------------------
| Auth Routes
|---------------------------------------------------------------------------
| Routes for user authentication (register, login, logout) and user management.
| Protected routes use `isAuth` middleware to verify authentication.
| Includes CRUD operations for members.
*/

import express from "express";
import authController from "../controller/auth.js";
import isAuth from "../middleware/isAuthenticated.js";

const router = express.Router();

router.route('/register').post(authController.postRegister)
router.route('/login').post(authController.postLogin);
router.route('/logout').get(isAuth, authController.getLogout);

// User Controller (Settings, Availability and Profile)
router.route('/user').get(isAuth, authController.getMemberList).post(isAuth, authController.postMember);
router.route('/user/:memberID').get(isAuth, authController.getMemberDetail).put(isAuth, authController.putMemberDetail).delete(isAuth, authController.deleteMember);

export default router;
