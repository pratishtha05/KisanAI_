"""
KisanAI Crop Disease Knowledge Base

Important:
- The ML model predicts the disease/class only.
- This knowledge base provides farmer-facing explanation and guidance.
- Source attribution is stored with each entry.
- Do not present this content as an official diagnosis.
"""

from typing import Any


DISEASE_KNOWLEDGE: dict[str, dict[str, Any]] = {

    # ============================================================
    # RICE
    # ============================================================

    "Rice__neck_blast": {
        "disease_name": "Rice Neck Blast",
        "crop": "Rice",

        "description": (
            "A form of rice blast that affects the neck region of the "
            "rice panicle. Severe infection can weaken or girdle the "
            "neck and may cause the panicle to bend or fall."
        ),

        "symptoms": [
            "Grayish-brown to dark lesions may develop around the panicle neck.",
            "The infected neck may become weakened or girdled.",
            "The panicle may bend, break or hang down.",
            "Early neck infection can interfere with grain formation.",
            "Later infection may result in poorly filled or poor-quality grains.",
        ],

        "favourable_conditions": [
            "Moist and humid conditions can favour blast development.",
            "Disease development is influenced by crop stage and variety susceptibility.",
        ],

        "causes": [
            "Rice blast is caused by the fungal pathogen associated with "
            "Magnaporthe/Pyricularia species."
        ],

        "recommended_actions": [
            "Inspect the neck and panicle area closely when blast symptoms are suspected.",
            "Maintain balanced nitrogen management and avoid excessive nitrogen application.",
            "Use locally recommended disease-management practices and suitable varieties.",
            "If symptoms are confirmed, consult local agricultural extension guidance "
            "before applying crop-protection products.",
        ],

        "prevention": [
            "Use suitable or recommended varieties where available.",
            "Maintain balanced crop nutrition.",
            "Monitor the crop during stages when blast risk is higher.",
            "Remove or manage infected crop residues according to local recommendations.",
        ],

        "source": {
            "organization": "Tamil Nadu Agricultural University (TNAU)",
            "title": "Crop Protection – Rice Diseases: Blast",
            "source_type": "Agricultural university crop-protection guidance",
            "url": "https://agritech.tnau.ac.in/crop_protection/rice_diseases/rice_1.html",
        },
    },


    # ============================================================
    # TOMATO
    # ============================================================

    "Tomato__early_blight": {
        "disease_name": "Tomato Early Blight",
        "crop": "Tomato",

        "description": (
            "A fungal disease caused by Alternaria solani that commonly "
            "produces characteristic dark leaf spots and can affect stems "
            "and fruits."
        ),

        "symptoms": [
            "Small dark or brown spots may appear on older leaves.",
            "Spots can enlarge and develop characteristic concentric rings.",
            "The surrounding leaf tissue may become yellow.",
            "Severe infection can cause premature leaf death and defoliation.",
            "Dark concentric lesions may also occur on fruit.",
        ],

        "favourable_conditions": [
            "Warm and humid conditions can favour disease development.",
            "Rainy or wet conditions can assist spread.",
            "Infected crop debris can serve as a source of infection.",
        ],

        "causes": [
            "The disease is caused by the fungal pathogen Alternaria solani.",
            "The pathogen can survive in infected plant debris and may spread "
            "through rain splash, wind and infected seed."
        ],

        "recommended_actions": [
            "Remove and properly manage infected crop debris.",
            "Maintain field sanitation.",
            "Use disease-free seed or planting material.",
            "Consider crop rotation with non-solanaceous crops.",
            "Follow locally recommended disease-management practices when symptoms are confirmed.",
        ],

        "prevention": [
            "Use healthy planting material.",
            "Maintain field sanitation.",
            "Avoid repeated cultivation of susceptible crops in the same area.",
            "Monitor lower and older leaves for early symptoms.",
        ],

        "source": {
            "organization": "Tamil Nadu Agricultural University (TNAU)",
            "title": "Early Blight – Alternaria solani",
            "source_type": "Agricultural university crop-protection guidance",
            "url": "https://agritech.tnau.ac.in/crop_protection/tomato_diseases_2.html",
        },
    },


    "Tomato__late_blight": {
        "disease_name": "Tomato Late Blight",
        "crop": "Tomato",

        "description": (
            "A serious disease caused by Phytophthora infestans that can "
            "affect tomato leaves, stems and fruits, particularly under "
            "cool, wet or humid conditions."
        ),

        "symptoms": [
            "Water-soaked dark lesions can appear on leaves and stems.",
            "Lesions can expand rapidly and cause extensive leaf death.",
            "White growth associated with the pathogen may be visible under humid conditions.",
            "Dark brown lesions may develop on fruits.",
            "Severely affected leaves may wither and die.",
        ],

        "favourable_conditions": [
            "Cool nights and warm days can favour disease development.",
            "Extended periods of wet weather, rain or fog increase risk.",
            "High humidity favours infection and disease spread.",
        ],

        "causes": [
            "The disease is caused by Phytophthora infestans.",
            "Infected plant debris can contribute to survival and spread."
        ],

        "recommended_actions": [
            "Inspect leaves, stems and fruit for rapidly expanding water-soaked lesions.",
            "Maintain proper drainage and avoid prolonged wetness around the crop.",
            "Remove severely affected plant material according to local recommendations.",
            "Follow locally recommended disease-management practices when symptoms are confirmed.",
        ],

        "prevention": [
            "Maintain good field drainage.",
            "Monitor crops closely during cool, wet and cloudy weather.",
            "Use crop rotation and sanitation practices where appropriate.",
            "Avoid unnecessary prolonged leaf wetness.",
        ],

        "source": {
            "organization": "Tamil Nadu Agricultural University (TNAU)",
            "title": "Late Blight – Phytophthora infestans",
            "source_type": "Agricultural university crop-protection guidance",
            "url": "https://agritech.tnau.ac.in/crop_protection/tomato_diseases_8.html",
        },
    },


    "Tomato__bacterial_spot": {
        "disease_name": "Tomato Bacterial Spot",
        "crop": "Tomato",

        "description": (
            "A bacterial disease that can affect tomato leaves and fruit, "
            "especially under moist conditions and splashing rain."
        ),

        "symptoms": [
            "Small brown, water-soaked spots may appear on leaves.",
            "Spots may have yellow halos.",
            "Older leaves may show defoliation as symptoms progress.",
            "Small water-soaked spots may develop on green fruit.",
            "Fruit lesions can become irregular, light brown and scabby.",
        ],

        "favourable_conditions": [
            "Moist weather favours disease development.",
            "High humidity and persistent dew can increase risk.",
            "Rain splash can assist disease spread.",
        ],

        "causes": [
            "The disease is associated with Xanthomonas bacterial pathogens.",
            "Infected plant debris and seed can contribute to disease survival and spread."
        ],

        "recommended_actions": [
            "Use disease-free seed and healthy planting material.",
            "Remove and properly manage affected plant material.",
            "Avoid unnecessary movement of wet plant material through the field.",
            "Follow locally recommended bacterial-disease management practices.",
        ],

        "prevention": [
            "Use disease-free seed.",
            "Maintain field sanitation.",
            "Avoid working through wet foliage where practical.",
            "Monitor the crop during prolonged humid or wet weather.",
        ],

        "source": {
            "organization": "Tamil Nadu Agricultural University (TNAU)",
            "title": "Bacterial Leaf Spot – Tomato",
            "source_type": "Agricultural university crop-protection guidance",
            "url": "https://agritech.tnau.ac.in/crop_protection/tomato_diseases_11.html",
        },
    },


    "Tomato__septoria_leaf_spot": {
        "disease_name": "Tomato Septoria Leaf Spot",
        "crop": "Tomato",

        "description": (
            "A fungal leaf-spot disease caused by Septoria lycopersici. "
            "It primarily affects leaves and can cause progressive defoliation."
        ),

        "symptoms": [
            "Small round to irregular spots may appear on leaves.",
            "Spots commonly have gray centres and darker margins.",
            "Spots may merge as the disease progresses.",
            "Severe infection can cause extensive leaf blighting and defoliation.",
            "Stems and flowers may also be affected.",
        ],

        "favourable_conditions": [
            "High humidity favours disease development.",
            "Rain splash can assist movement of spores.",
            "Infected plant debris can serve as a source of infection.",
        ],

        "causes": [
            "The disease is caused by Septoria lycopersici.",
            "The pathogen can survive in infected crop debris and spread through spores."
        ],

        "recommended_actions": [
            "Remove and properly manage affected plant material.",
            "Maintain field sanitation.",
            "Use healthy planting material.",
            "Follow locally recommended disease-management practices if symptoms are confirmed.",
        ],

        "prevention": [
            "Remove infected plant debris.",
            "Use healthy seed and planting material.",
            "Maintain good crop sanitation.",
            "Monitor the crop during periods of high humidity.",
        ],

        "source": {
            "organization": "Tamil Nadu Agricultural University (TNAU)",
            "title": "Septoria Leaf Spot – Tomato",
            "source_type": "Agricultural university crop-protection guidance",
            "url": "https://agritech.tnau.ac.in/crop_protection/tomato_diseases_4.html",
        },
    },


    # ============================================================
    # FALLBACK / OTHER MODEL CLASSES
    # ============================================================
    #
    # These entries should be populated only after their specific
    # source has been checked. Do not invent agricultural guidance.
}


def get_disease_knowledge(label: str) -> dict[str, Any] | None:
    """
    Return farmer-facing knowledge for a model label.

    The model label must exactly match the deployment label.
    """
    return DISEASE_KNOWLEDGE.get(label)


def get_source(label: str) -> dict[str, str] | None:
    """
    Return source metadata for a disease entry.
    """
    entry = DISEASE_KNOWLEDGE.get(label)

    if not entry:
        return None

    return entry.get("source")