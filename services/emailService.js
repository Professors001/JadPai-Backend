// services/emailService.js
const nodemailer = require('nodemailer');

// Create a "transporter" object using Gmail's SMTP server settings
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email from .env
        pass: process.env.EMAIL_PASS, // Your App Password from .env
    },
});

/**
 * Sends an email notification about a change in enrollment status.
 * @param {string} userEmail - The recipient's email address.
 * @param {string} userName - The recipient's name.
 * @param {string} eventName - The name of the event.
 * @param {string} newStatus - The new status ('confirmed', 'rejected', etc.).
 */
async function sendStatusChangeEmail(userEmail, userName, eventName, newStatus) {
    let subject = '';
    let htmlContent = '';

    // Customize the email content based on the new status
    if (newStatus === 'confirmed') {
        subject = `Your Enrollment is Confirmed for ${eventName}!`;
        htmlContent = `
            <p>Hi ${userName},</p>
            <p>Great news! Your enrollment for the event "<strong>${eventName}</strong>" has been confirmed.</p>
            <p>We look forward to seeing you there!</p>
            <p>Best regards,<br>The Event Team</p>
        `;
    } else if (newStatus === 'rejected') {
        subject = `Update on Your Enrollment for ${eventName}`;
        htmlContent = `
            <p>Hi ${userName},</p>
            <p>Thank you for your interest in the event "<strong>${eventName}</strong>".</p>
            <p>Unfortunately, we are unable to confirm your enrollment at this time. This may be due to the event reaching full capacity or other factors.</p>
            <p>We appreciate your understanding.</p>
            <p>Best regards,<br>The Event Team</p>
        `;
    } else {
        // You can add more templates for other statuses like 'waitlisted'
        return; // Don't send an email for statuses we don't have a template for
    }

    const mailOptions = {
        from: `"JadPai" <${process.env.EMAIL_USER}>`, // Sender address
        to: userEmail, // List of receivers
        subject: subject, // Subject line
        html: htmlContent, // HTML body content
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendStatusChangeEmail };