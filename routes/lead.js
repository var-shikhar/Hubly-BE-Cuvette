/*
|-------------------------------------------------------------------
| Lead Routes
|-------------------------------------------------------------------
| Routes for managing lead forms, details, and messages.
| Includes POST for new leads, GET for lead details, and PUT for updating messages.
*/


import express from "express";
import leadController from "../controller/lead.js";

const router = express.Router();

router.route('/form').post(leadController.postLeadForm)
router.route('/:leadID?').get(leadController.getLeadsDetails).post(leadController.postNewLead).put(leadController.putLeadMessage);


export default router;