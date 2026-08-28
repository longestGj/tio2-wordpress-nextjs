<?php

declare(strict_types=1);

/** @return array<string, mixed> */
function tio2_site_a_brand_homepage_fields(): array
{
    $items = static fn (array $rows): array => array_map(
        static fn (array $row): array => ['item_title' => $row[0], 'item_description' => $row[1]],
        $rows
    );

    return [
        'homepage_schema_version' => 'homepage-v0.3-brand',
        'hero_eyebrow' => 'TIOVAR · Titanium Dioxide for Industry',
        'hero_heading' => 'Application-Specific Titanium Dioxide',
        'hero_summary' => 'TIOVAR supplies application-specific rutile titanium dioxide (TiO₂) grades for coatings, plastics, masterbatch, inks and specialized uses, with selection and supply support.',
        'hero_image' => 0,
        'hero_image_alt' => '',
        'seo_title' => 'Titanium Dioxide Supplier & TiO2 Grades | TIOVAR',
        'seo_description' => 'TIOVAR supplies application-specific titanium dioxide (TiO2) grades for coatings, plastics, masterbatch, inks and specialized industrial applications.',
        'og_image' => 0,
        'primary_topic' => 'titanium dioxide',
        'secondary_topics' => [
            ['secondary_topic' => 'rutile titanium dioxide'],
            ['secondary_topic' => 'titanium dioxide grades'],
            ['secondary_topic' => 'TiO2 supplier'],
        ],
        'brand_hero_primary_label' => 'Discuss Your Requirement',
        'brand_hero_secondary_label' => 'Request Technical Documents',
        'brand_about_eyebrow' => 'Who we are · What we do',
        'brand_about_heading' => 'Titanium dioxide selection and supply support for industry',
        'brand_who_title' => 'Who We Are',
        'brand_who_body' => 'TIOVAR is an application-focused titanium dioxide supplier and brand serving industrial buyers, formulators and technical teams with a structured product portfolio.',
        'brand_what_title' => 'What We Do',
        'brand_what_body' => 'We support customers in selecting, comparing and evaluating TiO₂ grades, reviewing technical documents and moving toward commercial supply.',
        'brand_capabilities' => array_map(static fn (string $value): array => ['capability' => $value], [
            'Application-led grade selection', 'Current-grade comparison',
            'Technical document review', 'Sample and supply coordination',
        ]),
        'brand_metrics' => [
            ['metric_value' => '12+', 'metric_label' => 'Years of TiO₂ industry experience'],
            ['metric_value' => '30+', 'metric_label' => 'Countries served'],
            ['metric_value' => '30,000+', 'metric_label' => 'MT annual supply volume'],
        ],
        'brand_routes_eyebrow' => 'Start with your requirement',
        'brand_routes_heading' => 'Choose a starting point for your TiO₂ requirement',
        'brand_buyer_routes' => [
            ['route_title' => 'Start with an Application', 'route_description' => 'Tell us what you produce and review TiO₂ grades, selection factors and evaluation questions for the application.', 'route_cta_label' => 'Explore TiO₂ Applications'],
            ['route_title' => 'Start with a Current Grade', 'route_description' => 'Share your current titanium dioxide grade and application requirements to identify TIOVAR candidate grades worth testing.', 'route_cta_label' => 'Compare Your Current Grade'],
            ['route_title' => 'Start with a Technical Question', 'route_description' => 'Start with a performance question—dispersion, opacity, whiteness, undertone, weatherability, processing or thermal stability.', 'route_cta_label' => 'Explore Technical Guidance'],
        ],
        'brand_applications_eyebrow' => 'Applications',
        'brand_applications_heading' => 'Titanium Dioxide for Industrial Applications',
        'brand_applications_intro' => 'Select a TiO₂ grade around the formulation, processing conditions and required end-use performance—not a single powder specification.',
        'brand_applications' => $items([
            ['Coatings', 'Titanium dioxide for coatings is selected around hiding power, dispersion, gloss, durability and weatherability requirements.'],
            ['Plastics & Masterbatch', 'TiO₂ grades for plastics and masterbatch are evaluated around dispersion, opacity, processing behavior and end-use requirements.'],
            ['Printing Inks', 'Titanium dioxide for printing inks requires careful evaluation of dispersion, opacity and formulation compatibility.'],
            ['Decorative Paper', 'Titanium dioxide for decorative paper is evaluated around whiteness, opacity, retention and processing requirements.'],
            ['Solar Film', 'Titanium dioxide for solar and photovoltaic film is evaluated around reflectance, polymer compatibility, aging and lamination.'],
            ['High-Purity & Functional', 'High-purity titanium dioxide is selected around impurity control, particle design and downstream functional requirements.'],
        ]),
        'brand_families_eyebrow' => 'Products',
        'brand_families_heading' => 'Titanium Dioxide Product Families',
        'brand_families_intro' => 'TIOVAR organizes 25 titanium dioxide grades into eight application-led families, including rutile TiO₂ and grades for specialized end uses. Individual grades are introduced within the relevant application context.',
        'brand_product_families' => $items([
            ['Plastics & Masterbatch', 'Dispersion · processing · weatherability'],
            ['Engineering Plastics', 'Heat · degradation · mechanical retention'],
            ['Coatings', 'Hiding · gloss · viscosity · durability'],
            ['Printing Inks', 'Dispersion · opacity · oil absorption'],
            ['Decorative Paper', 'Whiteness · opacity · retention'],
            ['Solar Film', 'Reflectance · UV · polymer compatibility'],
            ['Universal', 'Application-dependent evaluation'],
            ['High-Purity / Functional', 'Purity · impurities · functional requirements'],
        ]),
        'brand_selection_eyebrow' => 'TiO₂ grade selection',
        'brand_selection_heading' => 'Titanium dioxide grade selection starts with the application',
        'brand_selection_intro' => 'A suitable grade is evaluated against the intended formulation, process and performance targets, then confirmed through customer testing under actual use conditions.',
        'brand_selection_factors' => $items([
            ['Dispersion & Processing', 'Binder or resin, loading, equipment, shear, temperature and process window.'],
            ['Appearance & Optical Performance', 'Hiding, tinting strength, whiteness, undertone, gloss and reflectance.'],
            ['Surface Treatment & Compatibility', 'Documented product design and interaction with the intended material system.'],
            ['Durability & Validation', 'Weathering, aging, yellowing and application-specific finished-product tests.'],
        ]),
        'brand_resources_eyebrow' => 'Technical Resources',
        'brand_resources_heading' => 'Technical Guidance for TiO₂ Selection and Comparison',
        'brand_technical_resources' => [
            ['resource_tag' => 'Guide', 'resource_title' => 'Rutile vs Anatase Titanium Dioxide', 'resource_description' => 'Understand crystal form without reducing selection to a single label.'],
            ['resource_tag' => 'Selection', 'resource_title' => 'Why TiO₂ Content Alone Is Not Enough', 'resource_description' => 'Connect powder data with formulation and process behavior.'],
            ['resource_tag' => 'Technical', 'resource_title' => 'How Surface Treatment Affects TiO₂ Selection', 'resource_description' => 'Plan comparisons around the finished pigment design.'],
            ['resource_tag' => 'Checklist', 'resource_title' => 'TiO₂ Evaluation Checklist', 'resource_description' => 'Compare candidates without assuming equivalent performance.'],
        ],
        'brand_process_eyebrow' => 'From selection to supply',
        'brand_process_heading' => 'From TiO₂ Grade Selection to Commercial Supply',
        'brand_evaluation_steps' => $items([
            ['Grade Selection', 'Application, current TiO₂ grade and target performance.'],
            ['Technical Documentation', 'Exact product, record type and applicable revision.'],
            ['Sample Evaluation', 'Sample need and planned customer test.'],
            ['Customer Validation', 'Formulation, processing and finished-product results.'],
            ['Commercial Supply', 'Quantity, destination, incoterm and export documents.'],
        ]),
        'brand_documents_eyebrow' => 'Controlled document access',
        'brand_documents_heading' => 'Request Titanium Dioxide Technical Documents',
        'brand_documents_intro' => 'Request the applicable TDS, SDS or other documentation for the grade under evaluation. Files are provided by request and matched to the relevant revision or batch context.',
        'brand_controlled_documents' => array_map(static fn (array $row): array => [
            'document_title' => $row[0], 'document_context' => $row[1], 'document_access' => 'Request',
        ], [
            ['Technical Data Sheet', 'Exact product + revision'],
            ['Safety Data Sheet', 'Product + market + language'],
            ['Certificate of Analysis', 'Batch or order context'],
            ['Commercial / Export Records', 'Transaction context'],
        ]),
        'brand_inquiry_eyebrow' => 'Technical & commercial inquiry',
        'brand_inquiry_heading' => 'Discuss Your Titanium Dioxide Requirement',
        'brand_inquiry_intro' => 'Tell us your application, current TiO₂ grade, technical requirement, target performance, sample need or commercial requirement.',
        'brand_inquiry_fields' => array_map(static fn (string $value): array => ['field_label' => $value], [
            'Company', 'Business email', 'Country', 'Application', 'Current grade', 'Expected volume',
        ]),
        'brand_inquiry_message_label' => 'Application, grade, document, sample or commercial requirement',
        'brand_inquiry_submit_label' => 'Submit an Inquiry',
        'brand_inquiry_helper_text' => 'Local preview only — no information is sent or saved.',
        'brand_inquiry_success_heading' => 'Your inquiry draft is complete',
        'brand_inquiry_success_message' => 'No information was sent or saved. Email delivery will be connected in a separately approved phase.',
        'brand_faq_eyebrow' => 'Frequently asked questions',
        'brand_faq_heading' => 'Common Questions About TiO₂ Grade Evaluation',
        'brand_faqs' => [
            ['faq_question' => 'Which titanium dioxide grade is suitable for my application?', 'faq_answer' => 'Selection starts with the formulation, process conditions and performance targets. TIOVAR can identify candidate grades for customer evaluation.'],
            ['faq_question' => 'Can I request a TDS, SDS or titanium dioxide sample?', 'faq_answer' => 'Yes. Specify the product or application context and the document or sample needed. TDS files are provided by request, not as public downloads.'],
            ['faq_question' => 'Can TIOVAR help me compare my current TiO₂ grade?', 'faq_answer' => 'Yes. Share the current grade, application and target performance so candidate TIOVAR grades can be identified for testing without assuming equivalence.'],
            ['faq_question' => 'What information should I provide for a grade recommendation or commercial offer?', 'faq_answer' => 'Provide the application, current grade, target performance, expected quantity, destination and any document or sample requirements.'],
        ],
        'brand_footer_description' => 'Application-specific titanium dioxide grades, technical evaluation and commercial supply support for industrial customers.',
    ];
}
