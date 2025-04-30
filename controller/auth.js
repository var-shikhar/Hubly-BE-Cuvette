/*
|--------------------------------------------------------------------------
| User Authentication and Management Controllers
|--------------------------------------------------------------------------
|
| This file contains controllers for handling user authentication, profile management,
| and user actions like login, registration, and updates. The controllers include:
|
| - `postLogin`: Authenticates the user, validates credentials, and issues JWT tokens.
| - `postRegister`: Handles user registration with validation and password hashing.
| - `getLogout`: Logs out the user by clearing authentication cookies and refresh token.
| - `getMemberList`: Retrieves a list of all users in the system.
| - `getMemberDetail`: Fetches details of a specific user.
| - `postMember`: Creates a new user and assigns them a role based on existing Admin.
| - `putMemberDetail`: Updates user profile information and changes the password if necessary.
| - `deleteMember`: Deletes a user, with checks to ensure only authorized actions.
|
| All controllers validate input and handle errors with the `CustomError` class.
| Responses include status codes based on the result of the operation, using `RouteCode`.
| 
| Authentication is done via JWT tokens, and bcrypt is used for hashing passwords securely.
|
*/

import bcrypt from "bcryptjs";
import { configDotenv } from "dotenv";
import { CustomError } from "../middleware/errorMiddleware.js";
import User from "../modal/user-modal.js";
import RouteCode from "../util/httpStatus.js";
import { generateJWTToken } from "../util/jwtToken.js";
import getReqUser from '../util/reqUser.js';

configDotenv();

const { SALT, NODE_ENV } = process.env;

// Login Controller
const postLogin = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new CustomError("Invalid credentials", RouteCode.CONFLICT.statusCode));
    }
    try {
        const foundUser = await User.findOne({ email });
        if (!foundUser) {
            return next(new CustomError("Invalid credentials", RouteCode.CONFLICT.statusCode));
        }

        // Check if the password is correct
        const isValidPassword = await bcrypt.compare(password, foundUser.password);
        if (!isValidPassword) {
            return next(new CustomError("Invalid credentials, email or password is incorrect", RouteCode.CONFLICT.statusCode));
        }

        // Generate JWT tokens
        const accessToken = generateJWTToken(foundUser, 'access', '2h');
        const refreshToken = generateJWTToken(foundUser, 'refresh', '7d');

        // Update refresh token in DB
        foundUser.refresh_token = refreshToken;
        await foundUser.save();

        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
        });

        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
        });


        // Send successful login response to the client
        const userDetail = {
            id: foundUser._id,
            name: foundUser.firstName + ' ' + foundUser.lastName,
            email: foundUser.email,
            isAdmin: foundUser.userRole === 'Admin',
        }
        return res.status(RouteCode.SUCCESS.statusCode).json(userDetail);
    } catch (error) {
        return next(error);
    }
};

// Register Controller
const postRegister = async (req, res, next) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return next(new CustomError("Invalid details shared!", RouteCode.BAD_REQUEST.statusCode));
    }

    if (password !== confirmPassword) {
        return next(new CustomError("Passwords do not match!", RouteCode.BAD_REQUEST.statusCode));
    }

    try {
        const foundSimilarUser = await User.findOne({ email });
        if (foundSimilarUser) return next(new CustomError("User already exists!", RouteCode.BAD_REQUEST.statusCode));

        const foundAdmin = await User.findOne({ userRole: 'Admin' });
        const userRole = foundAdmin ? 'Member' : 'Admin';
        const parentID = foundAdmin ? foundAdmin._id : null;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, Number(SALT));
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            userRole,
            parent: parentID,
        });

        await newUser.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'User created successfully' });
    } catch (error) {
        return next(error);
    }
};

// Logout Controller
const getLogout = async (req, res, next) => {
    try {
        // Get the refresh token from the cookies
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) return next(new CustomError("Something went wrong", RouteCode.BAD_REQUEST.statusCode));

        const foundUser = await User.findOne({ refresh_token: refreshToken });
        if (!foundUser) return next(new CustomError("Something went wrong", RouteCode.BAD_REQUEST.statusCode));

        // Remove refresh token in DB
        foundUser.refresh_token = null;
        await foundUser.save();

        // Clear cookies
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.status(RouteCode.SUCCESS.statusCode).json({ message: "User has Logged out successfully" });
    } catch (error) {
        return next(error);
    }
};

// Get Members List
const getMemberList = async (req, res, next) => {
    try {
        const foundUsers = await User.find();
        const finalList = foundUsers?.map(user => ({
            userId: user._id,
            userName: `${user.firstName} ${user.lastName}` ?? 'N/A',
            userPhone: user.contact ?? 'N/A',
            userEmail: user.email ?? 'N/A',
            userRole: user.userRole
        })) ?? [];

        return res.status(RouteCode.SUCCESS.statusCode).json(finalList);
    } catch (error) {
        next(error);
    }
}

// User's Profile Settings
const getMemberDetail = async (req, res, next) => {
    const { memberID } = req.params;
    if (!memberID) return next(new CustomError('Something went wrong, Try again!', RouteCode.BAD_REQUEST.statusCode));

    try {
        const foundUser = await User.findById(memberID);
        if (!foundUser) return next(new CustomError('Member not found!', RouteCode.NOT_FOUND.statusCode));

        const userDetails = {
            userID: foundUser._id,
            firstName: foundUser.firstName ?? 'N/a',
            lastName: foundUser.lastName ?? 'N/a',
            email: foundUser.email ?? 'N/a',
            phone: foundUser.contact,
            password: '',
            confirmPassword: '',
        }

        return res.status(RouteCode.SUCCESS.statusCode).json(userDetails);
    } catch (error) {
        next(error);
    }
}

// Create New User
const postMember = async (req, res, next) => {
    const { name, email, designation } = req.body;
    if (!name || !email || !designation) return next(new CustomError("Invalid details shared!", RouteCode.BAD_REQUEST.statusCode))
    try {
        const foundUser = await User.findOne({ email });
        if (foundUser) return next(new CustomError("User with this email already exists!", RouteCode.CONFLICT.statusCode));


        // Found Admin
        const foundAdmin = await User.findOne({ userRole: 'Admin' });
        if (!foundAdmin) return next(new CustomError("Something went wrong, Please try later!", RouteCode.CONFLICT.statusCode));

        const hashedPassword = await bcrypt.hash('User@1234', Number(SALT));

        const newUser = new User({
            firstName: name.split(' ')[0],
            lastName: name.split(' ')[1],
            email,
            password: hashedPassword,
            parent: foundAdmin._id,
            userRole: designation,
        });

        await newUser.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'User created successfully' });
    } catch (err) {
        next(err)
    }
}

// Update User's Profile
const putMemberDetail = async (req, res, next) => {
    const { userID, firstName, lastName, email, phone, password, confirmPassword } = req.body;
    // Validate required fields
    if (!firstName || !lastName || !email || !phone) return next(new CustomError("Invaild Fields", RouteCode.CONFLICT.statusCode));
    if (password && password !== confirmPassword) return next(new CustomError("Password does not match", RouteCode.CONFLICT.statusCode));

    try {
        const foundMember = await User.findById(userID);
        if (!foundMember) return next(new CustomError("Member not found!", RouteCode.NOT_FOUND.statusCode));

        // Check if their are another user with the same email
        if (foundMember.email !== email.trim()) {
            const existingUser = await User.findOne({ email, _id: { $ne: foundMember._id } });
            if (existingUser) return next(new CustomError("Email already in use", RouteCode.CONFLICT.statusCode));
        }

        foundMember.firstName = firstName.trim();
        foundMember.lastName = lastName.trim();

        // Update the password if provided
        if (foundMember.email !== email.trim() || foundMember.contact !== phone.trim()) {
            foundMember.email = email.trim();
            foundMember.contact = phone.trim();

            if (password) {
                const hashedPassword = await bcrypt.hash(password, Number(SALT));
                foundMember.password = hashedPassword;
                foundMember.refresh_token = null;
            }

            await foundMember.save();
            // Clear cookies to logout the user
            res.clearCookie("access_token");
            res.clearCookie("refresh_token");
            return res.status(RouteCode.LOGOUT_REQESTED.statusCode).json({ message: 'Profile updated successfully, Please login again' });
        }

        await foundMember.save();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Profile updated successfully' });
    } catch (error) {
        next(error);
    }
}

// Update User's Profile
const deleteMember = async (req, res, next) => {
    const { memberID } = req.params;
    // Validate required fields
    if (!memberID) return next(new CustomError("Something went wrong, Try again!", RouteCode.CONFLICT.statusCode));
    try {
        const validatUser = await User.findById(memberID);
        if (!validatUser) return next(new CustomError("Member not found!", RouteCode.NOT_FOUND.statusCode));

        if (validatUser.userRole === 'Admin') return next(new CustomError('Only members can be deleted!', RouteCode.UNAUTHORIZED.statusCode));
        if (validatUser.parent.toString() !== req.user.id.toString()) return next(new CustomError("Only admin can delete member!", RouteCode.UNAUTHORIZED.statusCode));


        await validatUser.deleteOne();
        return res.status(RouteCode.SUCCESS.statusCode).json({ message: 'Member has deleted successfully!' });
    } catch (error) {
        next(error);
    }
}

export default {
    getLogout, postLogin, getMemberList, postRegister, postMember,
    getMemberDetail, putMemberDetail, deleteMember,
};