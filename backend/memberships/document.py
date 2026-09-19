"""The printable, data-driven Kanteerava membership application."""

from io import BytesIO
from pathlib import Path

from django.utils import timezone
from PIL import Image, ImageOps
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import BaseDocTemplate, Flowable, Frame, PageTemplate


PAGE_WIDTH, PAGE_HEIGHT = A4
ASSETS = Path(__file__).resolve().parent / 'assets'
CREST = ASSETS / 'kanteerava-crest.png'
BSG_EMBLEM = ASSETS / 'bsg-emblem.png'
INK = (0.11, 0.11, 0.11)


def _lines(value, width, font='Times-Roman', size=10):
    """Wrap even long unbroken words without changing the document font size."""
    result = []
    for paragraph in str(value or '').replace('\r', '').split('\n'):
        words = paragraph.split(' ')
        line = ''
        for word in words:
            candidate = f'{line} {word}'.strip()
            if pdfmetrics.stringWidth(candidate, font, size) <= width:
                line = candidate
                continue
            if line:
                result.append(line)
                line = ''
            for character in word:
                if pdfmetrics.stringWidth(line + character, font, size) > width and line:
                    result.append(line)
                    line = ''
                line += character
        result.append(line)
    return result or ['']


class FormField(Flowable):
    """One dynamic-height printed field with true wrapped text and guide lines."""

    def __init__(self, label, value='', *, prepared_lines=None):
        super().__init__()
        self.label = label
        self.value = value
        self.prepared_lines = prepared_lines
        self.line_height = 12.5
        self.label_width = 139
        self.lines = []
        self.label_lines = []

    def wrap(self, available_width, available_height):
        self.width = available_width
        self.lines = self.prepared_lines or _lines(self.value, available_width - self.label_width - 14)
        self.label_lines = _lines(self.label, self.label_width - 8, 'Times-Bold', 10)
        self.height = max(23, max(len(self.lines), len(self.label_lines)) * self.line_height + 9)
        return self.width, self.height

    def split(self, available_width, available_height):
        self.wrap(available_width, available_height)
        if self.height <= available_height:
            return [self]
        line_count = int((available_height - 9) // self.line_height)
        if line_count < max(1, len(self.label_lines)):
            return []
        first = FormField(self.label, prepared_lines=self.lines[:line_count])
        rest = FormField(f'{self.label} (cont.)', prepared_lines=self.lines[line_count:])
        return [first, rest] if rest.prepared_lines else [first]

    def draw(self):
        canvas = self.canv
        canvas.setFillColorRGB(*INK)
        for index, line in enumerate(self.label_lines):
            canvas.setFont('Times-Bold', 10)
            canvas.drawString(0, self.height - 12 - index * self.line_height, line)
        for index, line in enumerate(self.lines):
            baseline = self.height - 12 - index * self.line_height
            canvas.setStrokeColorRGB(.30, .30, .30)
            canvas.setDash(1, 1.3)
            canvas.setLineWidth(.65)
            canvas.line(self.label_width, baseline - 3, self.width - 2, baseline - 3)
            canvas.setDash()
            canvas.setFillColorRGB(*INK)
            canvas.setFont('Times-Roman', 10)
            canvas.drawString(self.label_width + 5, baseline, line)
            for x in (self.label_width, self.width - 2):
                y = baseline - 3
                path = canvas.beginPath()
                path.moveTo(x, y + 2.5)
                path.lineTo(x + 2.5, y)
                path.lineTo(x, y - 2.5)
                path.lineTo(x - 2.5, y)
                path.close()
                canvas.setFillColorRGB(.12, .12, .12)
                canvas.drawPath(path, fill=1, stroke=0)


def _watermark():
    with Image.open(CREST) as source:
        source = source.convert('RGBA')
        grey = ImageOps.grayscale(source).convert('RGB')
        white = Image.new('RGB', source.size, 'white')
        alpha = source.getchannel('A').point(lambda value: round(value * .11))
        white.paste(grey, mask=alpha)
        return ImageReader(white)


def _contained_image(canvas, payload, x, y, width, height, *, crop=False):
    if not payload:
        return
    with Image.open(BytesIO(bytes(payload))) as source:
        source = ImageOps.exif_transpose(source)
        if crop:
            image = ImageOps.fit(source.convert('RGB'), (round(width * 3), round(height * 3)), centering=(.5, .5))
            canvas.drawImage(ImageReader(image), x, y, width, height)
        else:
            image = source.convert('RGBA')
            ratio = min(width / image.width, height / image.height)
            actual_width, actual_height = image.width * ratio, image.height * ratio
            canvas.drawImage(ImageReader(image), x + (width - actual_width) / 2, y + (height - actual_height) / 2, actual_width, actual_height, mask='auto')


def _draw_first_page(canvas, document):
    membership = document.membership
    canvas.saveState()
    canvas.drawImage(_watermark(), 98, 253, width=395, height=395)
    canvas.drawImage(str(BSG_EMBLEM), 42, 729, width=67, height=94, mask='auto', preserveAspectRatio=True)
    canvas.setFillColorRGB(*INK)
    canvas.setFont('Times-Bold', 15.8)
    canvas.drawString(117, 801, 'KANTEERAVA OPEN SCOUTS AND GUIDES GROUP')
    canvas.setFont('Times-Roman', 10.4)
    canvas.drawString(117, 780, 'C/O Makkalakoota, Pampa Mahakavi Road, Chamrajpet, Bengaluru, Karnataka 560018')
    canvas.setFont('Times-Bold', 20)
    canvas.drawCentredString(PAGE_WIDTH / 2, 744, 'Membership Application')
    canvas.setLineWidth(.65)
    canvas.line(185, 739, 410, 739)
    canvas.setFont('Times-Bold', 10.5)
    canvas.drawString(440, 712, 'Application No.')
    canvas.setFont('Times-Roman', 8.3)
    for offset, line in enumerate(_lines(membership.application_id, 113, size=8.3)):
        canvas.drawString(440, 698 - offset * 10, line)

    # The right column remains stable while the actual form fields flow below the heading.
    canvas.roundRect(438, 494, 119, 157, 10, stroke=1, fill=0)
    if membership.member_photo:
        _contained_image(canvas, membership.member_photo, 443, 499, 109, 147, crop=True)
    else:
        canvas.setFont('Times-Italic', 11)
        canvas.drawCentredString(497.5, 569, 'Applicant Photo')

    _contained_image(canvas, membership.applicant_signature, 444, 331, 108, 45)
    canvas.line(440, 326, 557, 326)
    canvas.setFont('Times-Roman', 10)
    canvas.drawCentredString(498, 313, 'Signature of the Applicant')
    _contained_image(canvas, membership.guardian_signature, 444, 249, 108, 44)
    canvas.line(440, 244, 557, 244)
    canvas.drawCentredString(498, 231, 'Signature of Parent / Guardian')

    canvas.setDash(1.3, 1.5)
    canvas.line(39, 147, PAGE_WIDTH - 39, 147)
    canvas.setDash()
    canvas.setFont('Times-Bold', 12)
    canvas.drawCentredString(PAGE_WIDTH / 2, 130, 'Office Use:')
    canvas.rect(45, 96, 10, 10, stroke=1, fill=0)
    canvas.setFont('Times-Roman', 11)
    canvas.drawString(63, 96, 'Approved')
    canvas.rect(184, 96, 10, 10, stroke=1, fill=0)
    canvas.drawString(202, 96, 'Not Approved')
    if membership.status == membership.Status.APPROVED:
        canvas.setFont('Times-Bold', 12)
        canvas.drawString(46, 96, 'X')
    approved_on = timezone.localtime(membership.approved_at).strftime('%d %B %Y') if membership.approved_at else ''
    canvas.setFont('Times-Roman', 9.5)
    canvas.drawString(45, 76, f'Approved on: {approved_on}')
    _contained_image(canvas, membership.admin_signature, 423, 74, 132, 40)
    canvas.line(420, 69, 557, 69)
    canvas.drawCentredString(488, 55, 'Authorized Signature')
    canvas.restoreState()


def _draw_additional_page(canvas, document):
    canvas.saveState()
    canvas.setFillColorRGB(*INK)
    canvas.setFont('Times-Bold', 16)
    canvas.drawString(40, 798, 'Additional Details')
    canvas.setFont('Times-Roman', 9)
    canvas.drawRightString(PAGE_WIDTH - 40, 800, document.membership.application_id)
    canvas.line(40, 788, PAGE_WIDTH - 40, 788)
    canvas.restoreState()


def build_official_pdf(membership):
    """Generate a PDF from the approval snapshot; the caller stores these exact bytes."""
    if not BSG_EMBLEM.is_file() or not CREST.is_file():
        raise ValueError('The official document logos are unavailable.')
    if not membership.applicant_signature or not membership.admin_signature:
        raise ValueError('Applicant and authorized signatures are required.')

    stream = BytesIO()
    document = BaseDocTemplate(stream, pagesize=A4, leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0,
                               title=f'Kanteerava Membership Application {membership.application_id}',
                               author='XV Kanteerava Open Unit')
    document.membership = membership
    first_frame = Frame(39, 159, 385, 544, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id='application')
    later_frame = Frame(40, 50, PAGE_WIDTH - 80, 725, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id='additional')
    document.addPageTemplates([
        PageTemplate(id='official', frames=[first_frame], onPage=_draw_first_page, autoNextPageTemplate='additional'),
        PageTemplate(id='additional', frames=[later_frame], onPage=_draw_additional_page),
    ])
    submitted_on = timezone.localtime(membership.submitted_at).strftime('%d %B %Y') if membership.submitted_at else ''
    fields = [
        ('Name of the Applicant (In Block letters)', membership.user.full_name),
        ("Father's / Guardian's Name", membership.parent_or_guardian),
        ('Date of Birth', membership.date_of_birth.strftime('%d %B %Y')),
        ('Residential Address', membership.address),
        ('Contact Number(s)', membership.contact_phone or membership.user.phone),
        ('Father/Mother/Guardian', ' / '.join(filter(None, [membership.emergency_contact_name, membership.emergency_contact_phone]))),
        ('Pin Code', membership.postal_code),
        ('E-mail Id', membership.user.email),
        ('Name of the School / College', membership.school_college),
        ('Grade & Section', membership.grade_section),
        ('Hobbies', membership.hobbies),
        ('Introduced By', membership.introduced_by),
        ('Section / Wing', membership.get_member_type_display()),
        ('Gender', membership.gender),
        ('Emergency relationship', membership.emergency_contact_relationship),
        ('Preferred patrol / group', membership.preferred_patrol),
        ('Previous Scout / Guide experience', membership.previous_experience),
        ('Joining date', membership.joining_date.strftime('%d %B %Y') if membership.joining_date else ''),
        ('Date', submitted_on),
    ]
    document.build([FormField(label, value) for label, value in fields])
    return stream.getvalue()
