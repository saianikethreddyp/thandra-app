import os
import re

class SimplePDF:
    def __init__(self, page_width=612, page_height=792):
        self.page_width = page_width
        self.page_height = page_height
        self.margin_left = 54
        self.margin_right = 54
        self.margin_top = 54
        self.margin_bottom = 54
        self.usable_width = page_width - self.margin_left - self.margin_right
        
        self.pages = []
        self.current_stream = []
        self.y = self.page_height - self.margin_top
        self.page_num = 0
        
        self.start_new_page()

    def start_new_page(self):
        if self.page_num > 0:
            self.pages.append("".join(self.current_stream))
            self.current_stream = []
        self.page_num += 1
        self.y = self.page_height - self.margin_top
        
        # Header line (pages > 1)
        if self.page_num > 1:
            self.add_text("Thandra Self Drive Cars -- Privacy Policy", 9, "Helvetica-Oblique", 0.5, 0.5, 0.5, y_override=self.page_height - 36)
            # line
            self.current_stream.append(f"0.85 0.85 0.85 RG 0.5 w {self.margin_left} {self.page_height - 42} m {self.page_width - self.margin_right} {self.page_height - 42} l S\n")
            
        # Footer
        footer_text = f"Page {self.page_num}"
        self.add_text(footer_text, 9, "Helvetica", 0.5, 0.5, 0.5, y_override=30, x_override=self.page_width / 2 - 15)

    def check_space(self, needed_height):
        if self.y - needed_height < self.margin_bottom:
            self.start_new_page()

    def escape_text(self, text):
        # Replace common unicode chars with ASCII equivalents
        text = text.replace('\u2014', '--').replace('\u2013', '-').replace('\u2022', '-')
        text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
        return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    def add_text(self, text, size=10, font="Helvetica", r=0.1, g=0.1, b=0.1, y_override=None, x_override=None):
        x = x_override if x_override is not None else self.margin_left
        y = y_override if y_override is not None else self.y
        escaped = self.escape_text(text)
        stream_frag = (
            f"BT\n"
            f"/{font} {size} Tf\n"
            f"{r:.2f} {g:.2f} {b:.2f} rg\n"
            f"{x:.2f} {y:.2f} Td\n"
            f"({escaped}) Tj\n"
            f"ET\n"
        )
        self.current_stream.append(stream_frag)

    def wrap_text(self, text, font, size, max_width):
        # Approximation of character widths for Helvetica
        char_width = size * 0.52
        if "Bold" in font:
            char_width = size * 0.56
        max_chars = max(10, int(max_width / char_width))
        
        words = text.split()
        lines = []
        cur_line = []
        cur_len = 0
        
        for w in words:
            if cur_len + len(w) + 1 <= max_chars:
                cur_line.append(w)
                cur_len += len(w) + 1
            else:
                if cur_line:
                    lines.append(" ".join(cur_line))
                cur_line = [w]
                cur_len = len(w)
        if cur_line:
            lines.append(" ".join(cur_line))
        return lines

    def add_title(self, text):
        self.check_space(50)
        self.add_text(text, 22, "Helvetica-Bold", 0.06, 0.09, 0.16)
        self.y -= 28

    def add_subtitle(self, text):
        self.check_space(25)
        self.add_text(text, 10, "Helvetica", 0.39, 0.45, 0.55)
        self.y -= 16

    def add_heading(self, text):
        self.check_space(35)
        self.y -= 10
        # Accent bar
        self.current_stream.append(f"0.06 0.09 0.16 rg {self.margin_left} {self.y - 2} 3 14 re f\n")
        self.add_text(text, 13, "Helvetica-Bold", 0.06, 0.09, 0.16, x_override=self.margin_left + 10)
        self.y -= 20

    def add_subheading(self, text):
        self.check_space(25)
        self.y -= 6
        self.add_text(text, 11, "Helvetica-Bold", 0.15, 0.23, 0.35)
        self.y -= 16

    def add_paragraph(self, text, size=10, font="Helvetica", color=(0.12, 0.16, 0.23), line_spacing=14):
        lines = self.wrap_text(text, font, size, self.usable_width)
        for line in lines:
            self.check_space(line_spacing)
            self.add_text(line, size, font, color[0], color[1], color[2])
            self.y -= line_spacing
        self.y -= 4

    def add_bullet(self, title, body):
        prefix = "- " + (title + ": " if title else "")
        full_text = prefix + body
        lines = self.wrap_text(full_text, "Helvetica", 9.5, self.usable_width - 14)
        for idx, line in enumerate(lines):
            self.check_space(13)
            indent = 14 if idx > 0 else 4
            self.add_text(line, 9.5, "Helvetica-Bold" if (idx == 0 and title) else "Helvetica", 0.12, 0.16, 0.23, x_override=self.margin_left + indent)
            self.y -= 13
        self.y -= 3

    def add_box(self, title, text):
        self.check_space(70)
        self.y -= 6
        lines = self.wrap_text(text, "Helvetica", 9, self.usable_width - 24)
        box_height = len(lines) * 13 + 34
        
        # Light blue background box
        self.current_stream.append(f"0.94 0.96 1.0 rg {self.margin_left} {self.y - box_height} {self.usable_width} {box_height} re f\n")
        self.current_stream.append(f"0.75 0.86 0.99 RG 1 w {self.margin_left} {self.y - box_height} {self.usable_width} {box_height} re S\n")
        
        box_y = self.y - 18
        self.add_text(title, 10, "Helvetica-Bold", 0.12, 0.25, 0.69, x_override=self.margin_left + 12, y_override=box_y)
        box_y -= 16
        for line in lines:
            self.add_text(line, 9, "Helvetica", 0.1, 0.15, 0.25, x_override=self.margin_left + 12, y_override=box_y)
            box_y -= 13
            
        self.y -= (box_height + 12)

    def build(self, output_path):
        if self.current_stream:
            self.pages.append("".join(self.current_stream))
            
        objects = []
        
        # 1: Catalog
        objects.append("<< /Type /Catalog /Pages 2 0 R >>")
        
        # 2: Pages
        page_refs = [f"{i * 2 + 3} 0 R" for i in range(len(self.pages))]
        objects.append(f"<< /Type /Pages /Kids [{' '.join(page_refs)}] /Count {len(self.pages)} >>")
        
        # Pages and Streams
        for i, page_content in enumerate(self.pages):
            page_obj_num = i * 2 + 3
            stream_obj_num = page_obj_num + 1
            
            # Page object
            page_dict = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.page_width} {self.page_height}] "
                f"/Contents {stream_obj_num} 0 R "
                f"/Resources << /Font << "
                f"/Helvetica << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> "
                f"/Helvetica-Bold << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> "
                f"/Helvetica-Oblique << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >> "
                f">> >> >>"
            )
            objects.append(page_dict)
            
            # Stream object
            stream_bytes = page_content.encode('latin1')
            stream_obj = f"<< /Length {len(stream_bytes)} >>\nstream\n{page_content}\nendstream"
            objects.append(stream_obj)

        # Build output buffer with Xref table
        buffer = bytearray()
        buffer.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        
        offsets = []
        for i, obj in enumerate(objects):
            offsets.append(len(buffer))
            buffer.extend(f"{i + 1} 0 obj\n{obj}\nendobj\n".encode('latin1'))
            
        xref_offset = len(buffer)
        buffer.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode('latin1'))
        for off in offsets:
            buffer.extend(f"{off:010d} 00000 n \n".encode('latin1'))
            
        trailer = (
            f"trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        )
        buffer.extend(trailer.encode('latin1'))
        
        with open(output_path, "wb") as f:
            f.write(buffer)
        print(f"Successfully generated {output_path} with {len(self.pages)} pages.")

def generate():
    pdf = SimplePDF()
    
    # Title & Metadata
    pdf.add_title("Privacy Policy")
    pdf.add_subtitle("Application: Thandra Self Drive Cars | Package: com.thandra.selfdrive | Date: September 29, 2026")
    pdf.y -= 8
    
    pdf.add_paragraph("Welcome to Thandra Self Drive Cars (\"Thandra,\" \"we,\" \"our,\" or \"us\"). We are committed to protecting your privacy and ensuring your personal information is handled safely, transparently, and responsibly. This Privacy Policy describes how we collect, use, process, and safeguard your information when you use the Thandra mobile application and our vehicle reservation services.")
    
    # 1. Information We Collect
    pdf.add_heading("1. Information We Collect")
    pdf.add_paragraph("To facilitate self-drive car reservations, vehicle security, regulatory transport compliance, and rental verification, we collect the following categories of information:")
    
    pdf.add_subheading("A. Personal Identification & Contact Information")
    pdf.add_bullet("Full Name & Phone Number", "Collected for customer profile identification, booking OTP dispatch, and reservation updates.")
    pdf.add_bullet("Permanent Residential Address", "Required for vehicle contract establishment and identity cross-verification.")
    pdf.add_bullet("Emergency Reference Contacts", "Name and contact numbers of personal references (such as close family, guarantor, or emergency contact) provided during reservation or financing.")
    
    pdf.add_subheading("B. Government-Issued Identity & Driving Credentials")
    pdf.add_bullet("Driving License Number", "Verified to confirm legal eligibility to operate motor vehicles under applicable road transport laws.")
    pdf.add_bullet("Aadhaar & PAN Numbers", "Collected for statutory identity verification, rental contract formation, and Zero-Damage Escrow authorization.")

    pdf.add_subheading("C. Vehicle Reservation & Itinerary Data")
    pdf.add_bullet("Trip Details", "Selected vehicle machine, registration plate, pickup branch hub, destination points, pickup date/time, and return schedule.")

    pdf.add_subheading("D. Financing & Payment Assistance Data")
    pdf.add_bullet("Finance Inquiries", "Loan reference details, banking partners, product specifications, and application amounts for customers seeking vehicle rental financing.")

    # 2. Contact Information & Emergency References
    pdf.add_heading("2. Emergency Reference Contacts Policy")
    pdf.add_box(
        "Prominent Disclosure: Contact Access Purpose",
        "Thandra requests access to your device contacts strictly to allow you to conveniently select emergency contact references for vehicle reservation and financing safety verification. With your affirmative consent, contact data is processed securely to maintain emergency contact references during the rental period. We do not sell, rent, monetize, or trade contact information with third-party marketing networks."
    )

    # 3. How We Use Your Information
    pdf.add_heading("3. How We Use Your Information")
    pdf.add_bullet("Reservation Management", "To process, confirm, allocate vehicles, and manage reservation schedules across our branch hubs.")
    pdf.add_bullet("Fraud Prevention & Vehicle Security", "To verify driving credentials, prevent unauthorized vehicle handover, and protect assets from theft or absconding.")
    pdf.add_bullet("Emergency Assistance", "To contact designated emergency references in the event of an accident, vehicle breakdown, or urgent safety incident.")
    pdf.add_bullet("Legal & Transport Compliance", "To comply with statutory motor vehicle laws, police verification norms, and tax reporting requirements.")

    # 4. Data Security & Storage
    pdf.add_heading("4. Data Security & Cloud Storage")
    pdf.add_paragraph("We implement rigorous technical and organizational safeguards to ensure data security. All network transmissions are protected using industry-standard SSL/TLS encryption. Booking records, identity verification details, and emergency references are stored in enterprise cloud databases hosted by Google Cloud / Firebase. Access is strictly restricted to authorized branch personnel.")

    # 5. Third-Party Service Providers
    pdf.add_heading("5. Third-Party Service Providers")
    pdf.add_paragraph("We only share data with trusted third parties strictly necessary to deliver application features:")
    pdf.add_bullet("Google Firebase", "Provides secure cloud database hosting, authentication services, and data storage.")
    pdf.add_bullet("ImgBB API", "Used solely for hosting approved promotional vehicle imagery and banner assets.")
    pdf.add_bullet("Law Enforcement", "Shared strictly when legally mandated by court order or statutory criminal investigation involving vehicle misuse.")

    # 6. Account & Data Deletion Rights
    pdf.add_heading("6. Account & Personal Data Deletion Rights")
    pdf.add_paragraph("In full compliance with Apple App Store Review Guidelines (Guideline 5.1.1(v)) and Google Play Developer Policies, all users have the right to request permanent deletion of their account, reservation records, and submitted personal data at any time.")
    
    pdf.add_box(
        "How to Delete Your Account & Personal Data",
        "1. In-App Instant Deletion: Open the Thandra app, go to your Dashboard, and tap 'Delete Account & Data'. Confirm the prompt to immediately purge your active profile and session data.\n2. Email Deletion Request: Send an email to thandrasselfdrivebnreddy11@gmail.com with the subject 'Data Deletion Request'. All associated booking records and identity data will be permanently scrubbed from our active databases within 7 business days."
    )

    # 7. Data Retention & Children
    pdf.add_heading("7. Data Retention & Children's Privacy")
    pdf.add_paragraph("Personal data is retained only as long as necessary to complete your rental service or comply with statutory vehicle leasing audit requirements. Once the retention period lapses or a deletion request is confirmed, data is permanently scrubbed.")
    pdf.add_paragraph("Our services are strictly restricted to licensed drivers aged 18 and older. We do not knowingly solicit or collect data from minors.")

    # 8. Contact Us
    pdf.add_heading("8. Contact Us & Grievance Redressal")
    pdf.add_paragraph("For any questions, concerns, or requests regarding this Privacy Policy or your personal data rights, please contact:")
    pdf.add_bullet("Company", "Thandra Self Drive Cars")
    pdf.add_bullet("Email", "thandrasselfdrivebnreddy11@gmail.com")
    pdf.add_bullet("Registered Address", "Vidhya Nagar, Jagtial, Karimnagar, Telangana - 505327, India")
    
    output_pdf = "Privacy_Policy_Thandra.pdf"
    pdf.build(output_pdf)

if __name__ == "__main__":
    generate()
