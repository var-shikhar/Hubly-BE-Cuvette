import express from "express";
import leadController from "../controller/lead.js";

const router = express.Router();

// Leads Controller
router.route('/form').post(leadController.postLeadForm)
router.route('/:leadID?').get(leadController.getLeadsDetails).post(leadController.postNewLead).put(leadController.putLeadMessage);


export default router;