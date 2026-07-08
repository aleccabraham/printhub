const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;
if (config.smtp.configured) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    // Some hosts silently drop outbound SMTP traffic instead of rejecting
    // it, which otherwise hangs the connection indefinitely. Fail fast so
    // the failure is visible instead of blocking forever.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

// Sends an email via real SMTP if configured, otherwise logs it to the console
// so the flow stays testable end-to-end without real credentials.
async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('\n--- [email fallback: SMTP not configured] -------------------------');
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${text || html}`);
    console.log('---------------------------------------------------------------------\n');
    return { delivered: false, mode: 'console' };
  }

  await transporter.sendMail({
    from: config.smtp.user,
    to,
    subject,
    html,
    text,
  });
  return { delivered: true, mode: 'smtp' };
}

async function sendAdminNotification({ job, baseUrl }) {
  const approveUrl = `${baseUrl}/api/link/approve/${job.approval_token}`;
  const rejectUrl = `${baseUrl}/api/link/reject/${job.approval_token}`;
  const documentUrl = `${baseUrl}/${job.file_path.replace(/\\/g, '/')}`;
  const screenshotUrl = `${baseUrl}/${job.screenshot_path.replace(/\\/g, '/')}`;

  const pageDetail =
    job.page_range_type === 'custom' ? `Custom range (${job.page_range}) — ${job.pages_to_print} pages` : `All pages — ${job.pages_to_print} pages`;

  const text = `New print job pending approval

Job ID: ${job.id}
Student: ${job.student_name} (Register No: ${job.register_no}) <${job.student_email}>
Document: ${job.file_name}
Document link: ${documentUrl}

Print options:
- Page selection: ${pageDetail}
- Paper size: ${job.paper_size}
- Print mode: ${job.print_mode}
- Sides: ${job.sides}
- Copies: ${job.copies}
- Binding: ${job.binding}
- Total amount: Rs.${job.total_amount}

Payment proof:
- UPI reference ID: ${job.upi_reference_id}
- Screenshot: ${screenshotUrl}

Please confirm you've received Rs.${job.total_amount} via UPI ref ${job.upi_reference_id} before approving.

APPROVE: ${approveUrl}
REJECT:  ${rejectUrl}

(Each link is single-use and expires in 24 hours.)
`;

  const html = `
    <h2>New print job pending approval</h2>
    <p><strong>Job ID:</strong> ${job.id}<br/>
    <strong>Student:</strong> ${job.student_name} (Register No: ${job.register_no}) &lt;${job.student_email}&gt;<br/>
    <strong>Document:</strong> <a href="${documentUrl}">${job.file_name}</a></p>
    <h3>Print options</h3>
    <ul>
      <li>Page selection: ${pageDetail}</li>
      <li>Paper size: ${job.paper_size}</li>
      <li>Print mode: ${job.print_mode}</li>
      <li>Sides: ${job.sides}</li>
      <li>Copies: ${job.copies}</li>
      <li>Binding: ${job.binding}</li>
      <li>Total amount: Rs.${job.total_amount}</li>
    </ul>
    <h3>Payment proof</h3>
    <p>UPI reference ID: <strong>${job.upi_reference_id}</strong><br/>
    <a href="${screenshotUrl}">View payment screenshot</a></p>
    <p><strong>Please confirm you've received Rs.${job.total_amount} via UPI ref ${job.upi_reference_id} before approving.</strong></p>
    <p>
      <a href="${approveUrl}" style="background:#5B2A6B;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;margin-right:10px;">Approve</a>
      <a href="${rejectUrl}" style="background:#fff;color:#5B2A6B;border:1px solid #5B2A6B;padding:10px 20px;border-radius:999px;text-decoration:none;">Reject</a>
    </p>
    <p style="color:#888;font-size:12px;">Each link is single-use and expires in 24 hours.</p>
  `;

  return sendMail({ to: config.adminEmail, subject: `[PrintHub] Approval needed — ${job.student_name} (${job.id})`, html, text });
}

async function sendStudentApproved({ job, baseUrl }) {
  const statusUrl = `${baseUrl}/status/${job.id}`;
  const pickup = new Date(job.expected_pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const text = `Hi ${job.student_name},

Your print job has been approved and added to the queue!

Job ID: ${job.id}
Queue position: ${job.queue_position}
Expected pickup: ${pickup}

Check live status: ${statusUrl}

- PrintHub`;

  return sendMail({ to: job.student_email, subject: `[PrintHub] Job approved — ready by ${pickup}`, text });
}

async function sendStudentRejected({ job, baseUrl }) {
  const statusUrl = `${baseUrl}/status/${job.id}`;
  const reasonLine = job.rejection_reason ? `\nReason: ${job.rejection_reason}` : '';
  const text = `Hi ${job.student_name},

Unfortunately your print job was not approved.

Job ID: ${job.id}${reasonLine}

Check status: ${statusUrl}

- PrintHub`;

  return sendMail({ to: job.student_email, subject: '[PrintHub] Job not approved', text });
}

module.exports = {
  sendMail,
  sendAdminNotification,
  sendStudentApproved,
  sendStudentRejected,
};
