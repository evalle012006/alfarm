import nodemailer from 'nodemailer';

// Email configuration using Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface BookingEmailData {
  booking_id: number;
  guest_name: string;
  guest_email: string;
  booking_date: string;
  check_out_date?: string | null;
  booking_type: 'day' | 'overnight';
  total_amount: number;
  items: Array<{
    name: string;
    quantity: number;
    subtotal: number;
  }>;
  status: string;
}

export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<boolean> {
  const {
    booking_id,
    guest_name,
    guest_email,
    booking_date,
    check_out_date,
    booking_type,
    total_amount,
    items,
    status,
  } = data;

  const formattedDate = new Date(booking_date).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedCheckOut = check_out_date
    ? new Date(check_out_date).toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₱${item.subtotal.toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2d5a27 0%, #4a7c43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">AlFarm Resort</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">& Adventure Park</p>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
        <h2 style="color: #2d5a27; margin-top: 0;">Booking ${status === 'confirmed' ? 'Confirmed' : 'Received'}!</h2>
        
        <p>Dear <strong>${guest_name}</strong>,</p>
        
        <p>Thank you for choosing AlFarm Resort & Adventure Park! ${
          status === 'confirmed'
            ? 'Your booking has been confirmed.'
            : 'We have received your booking request and will confirm it shortly.'
        }</p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d5a27;">Booking Details</h3>
          <p style="margin: 5px 0;"><strong>Booking ID:</strong> #${booking_id}</p>
          <p style="margin: 5px 0;"><strong>Type:</strong> ${booking_type === 'overnight' ? 'Overnight Stay' : 'Day Use'}</p>
          <p style="margin: 5px 0;"><strong>${booking_type === 'overnight' ? 'Check-in' : 'Date'}:</strong> ${formattedDate}</p>
          ${formattedCheckOut ? `<p style="margin: 5px 0;"><strong>Check-out:</strong> ${formattedCheckOut}</p>` : ''}
        </div>
        
        <h3 style="color: #2d5a27;">Your Reservation</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #2d5a27; color: white;">
              <td colspan="2" style="padding: 15px; font-weight: bold;">Total Amount</td>
              <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">₱${total_amount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; padding: 20px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h4 style="margin-top: 0; color: #856404;">Important Reminders</h4>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            <li>Please arrive on time for your scheduled visit</li>
            <li>Bring a valid ID for check-in</li>
            <li>Payment is due upon arrival unless otherwise arranged</li>
            <li>For cancellations, please contact us at least 24 hours in advance</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #666;">Questions? Contact us:</p>
          <p style="margin: 5px 0;">
            <strong>Email:</strong> info@alfarm.com | <strong>Phone:</strong> +63 XXX XXX XXXX
          </p>
        </div>
      </div>
      
      <div style="background: #333; color: #fff; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; font-size: 14px;">© ${new Date().getFullYear()} AlFarm Resort & Adventure Park</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #aaa;">Nature · Adventure · Escape</p>
      </div>
    </body>
    </html>
  `;

  const text = `
AlFarm Resort & Adventure Park
Booking ${status === 'confirmed' ? 'Confirmed' : 'Received'}!

Dear ${guest_name},

Thank you for choosing AlFarm Resort & Adventure Park!

BOOKING DETAILS
---------------
Booking ID: #${booking_id}
Type: ${booking_type === 'overnight' ? 'Overnight Stay' : 'Day Use'}
${booking_type === 'overnight' ? 'Check-in' : 'Date'}: ${formattedDate}
${formattedCheckOut ? `Check-out: ${formattedCheckOut}` : ''}

YOUR RESERVATION
----------------
${items.map((item) => `${item.name} x${item.quantity} - ₱${item.subtotal.toLocaleString()}`).join('\n')}

TOTAL: ₱${total_amount.toLocaleString()}

IMPORTANT REMINDERS
-------------------
- Please arrive on time for your scheduled visit
- Bring a valid ID for check-in
- Payment is due upon arrival unless otherwise arranged
- For cancellations, please contact us at least 24 hours in advance

Questions? Contact us at info@alfarm.com

© ${new Date().getFullYear()} AlFarm Resort & Adventure Park
  `;

  try {
    await transporter.sendMail({
      from: `"AlFarm Resort" <${process.env.SMTP_FROM || 'noreply@alfarm.com'}>`,
      to: guest_email,
      subject: `Booking ${status === 'confirmed' ? 'Confirmed' : 'Received'} - AlFarm Resort #${booking_id}`,
      text,
      html,
    });

    console.log(`Booking confirmation email sent to ${guest_email}`);
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    return false;
  }
}

export async function sendBookingStatusUpdateEmail(
  guest_email: string,
  guest_name: string,
  booking_id: number,
  new_status: string
): Promise<boolean> {
  const statusMessages: Record<string, { subject: string; message: string }> = {
    confirmed: {
      subject: 'Booking Confirmed',
      message: 'Great news! Your booking has been confirmed. We look forward to seeing you!',
    },
    checked_in: {
      subject: 'Welcome to AlFarm!',
      message: 'You have been checked in. Enjoy your stay at AlFarm Resort & Adventure Park!',
    },
    completed: {
      subject: 'Thank You for Visiting',
      message: 'Thank you for staying with us! We hope you had a wonderful experience. Please visit us again!',
    },
    cancelled: {
      subject: 'Booking Cancelled',
      message: 'Your booking has been cancelled. If you have any questions, please contact us.',
    },
  };

  const statusInfo = statusMessages[new_status];
  if (!statusInfo) return false;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2d5a27 0%, #4a7c43 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">AlFarm Resort</h1>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #eee;">
        <h2 style="color: #2d5a27;">${statusInfo.subject}</h2>
        <p>Dear ${guest_name},</p>
        <p>${statusInfo.message}</p>
        <p><strong>Booking ID:</strong> #${booking_id}</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      </div>
      
      <div style="background: #333; color: #fff; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; font-size: 12px;">© ${new Date().getFullYear()} AlFarm Resort & Adventure Park</p>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"AlFarm Resort" <${process.env.SMTP_FROM || 'noreply@alfarm.com'}>`,
      to: guest_email,
      subject: `${statusInfo.subject} - AlFarm Resort #${booking_id}`,
      html,
    });

    return true;
  } catch (error) {
    console.error('Failed to send status update email:', error);
    return false;
  }
}
