"""Source-backed crop disease knowledge for KisanAI.

The MobileNetV3 model performs visual classification. This module contains
farmer-facing agricultural information shown after classification.

Fields intentionally match the current disease UI:
    description
    symptoms
    favourable_conditions
    recommended_actions
    prevention
    source

verification_status:
    verified          = information checked against a disease-specific source
    general_reference = basic non-prescriptive information from a broader
                         agricultural reference; not used to claim a specific
                         treatment or official threshold
    healthy_class_no_disease_knowledge_required = healthy model class
"""

from typing import Dict


DISEASE_KNOWLEDGE: Dict[str, Dict[str, object]] = {'Apple__black_rot': {'disease_name': 'Apple Black Rot',
                      'crop': 'Apple',
                      'description': 'A fungal disease that can affect apple leaves, fruit and '
                                     'woody tissue.',
                      'symptoms': ['Frogeye-like leaf spots may develop and fruit can develop '
                                   'expanding dark, sunken rot.',
                                   'Cankers may occur on branches or limbs.'],
                      'favourable_conditions': ['Warm, humid and wet conditions can favour '
                                                'infection.'],
                      'recommended_actions': ['Remove and dispose of visibly diseased fruit and '
                                              'infected plant material where practical.',
                                              'Monitor leaves, fruit and branches during warm, wet '
                                              'periods.'],
                      'prevention': ['Maintain orchard sanitation and remove infected or mummified '
                                     'fruit and dead wood where practical.'],
                      'source': {'organization': 'Cornell Cooperative Extension',
                                 'title': 'Apple Disease and Pest Management Resources',
                                 'source_type': 'General agricultural extension reference',
                                 'url': 'https://cals.cornell.edu/school-integrative-plant-science/school-sections/plant-pathology-plant-microbe-biology'},
                      'verification_status': 'general_reference'},
 'Apple__healthy': {'disease_name': 'Apple Healthy',
                    'crop': 'Apple',
                    'description': '',
                    'symptoms': [],
                    'favourable_conditions': [],
                    'recommended_actions': [],
                    'prevention': [],
                    'source': None,
                    'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Apple__rust': {'disease_name': 'Apple Rust',
                 'crop': 'Apple',
                 'description': 'A group of rust diseases that can produce characteristic yellow '
                                'to orange leaf symptoms on apple.',
                 'symptoms': ['Yellow or orange spots can develop on leaves; some cedar-apple rust '
                              'infections produce orange gelatinous structures on alternate '
                              'hosts.'],
                 'favourable_conditions': ['Moist conditions during infection periods favour rust '
                                           'development.'],
                 'recommended_actions': ['Inspect leaves regularly for orange or yellow rust '
                                         'symptoms.',
                                         'Remove infected plant material where practical and '
                                         'follow local extension guidance.'],
                 'prevention': ['Where applicable, reduce nearby alternate rust hosts and choose '
                                'locally suitable resistant cultivars.'],
                 'source': {'organization': 'University of Minnesota Extension',
                            'title': 'Cedar-apple rust and related rust diseases',
                            'source_type': 'University agricultural extension reference',
                            'url': 'https://extension.umn.edu/plant-diseases/cedar-apple-rust'},
                 'verification_status': 'general_reference'},
 'Apple__scab': {'disease_name': 'Apple Scab',
                 'crop': 'Apple',
                 'description': 'A fungal disease of apple leaves and fruit caused by Venturia '
                                'inaequalis.',
                 'symptoms': ['Superficial velvety dark-olive to black spots can appear on leaves '
                              'and fruit; fruit spots become scab-like and fruit tissue may become '
                              'misshapen.'],
                 'favourable_conditions': ['Prolonged moisture and wet conditions, especially '
                                           'during spring rains.'],
                 'recommended_actions': ['Reduce or remove infected fallen leaves where practical '
                                         'to reduce primary inoculum.',
                                         'Use locally recommended apple-scab management practices '
                                         'and monitor during wet periods.'],
                 'prevention': ['Orchard sanitation and management of primary infections in '
                                'spring.'],
                 'source': {'organization': 'UC IPM',
                            'title': 'Apple Scab — Apple Pest Management Guidelines',
                            'source_type': 'University agricultural extension/IPM',
                            'url': 'https://ipm.ucanr.edu/agriculture/apple/apple-scab/'},
                 'verification_status': 'verified'},
 'Cassava__bacterial_blight': {'disease_name': 'Cassava Bacterial Blight',
                               'crop': 'Cassava',
                               'description': 'A bacterial disease that can cause leaf, stem and '
                                              'shoot symptoms in cassava.',
                               'symptoms': ['Water-soaked or angular leaf spots can enlarge and '
                                            'cause leaf blight.',
                                            'Wilting, shoot dieback and bacterial exudates may '
                                            'occur in affected plants.'],
                               'favourable_conditions': ['Warm, wet conditions and splashing rain '
                                                         'can favour disease spread.'],
                               'recommended_actions': ['Remove severely affected plant material '
                                                       'where practical.',
                                                       'Use healthy planting material and monitor '
                                                       'neighbouring plants.'],
                               'prevention': ['Use clean planting material and maintain field '
                                              'sanitation.'],
                               'source': {'organization': 'IITA',
                                          'title': 'Cassava research and crop protection resources',
                                          'source_type': 'International agricultural research '
                                                         'reference',
                                          'url': 'https://www.iita.org/research/'},
                               'verification_status': 'general_reference'},
 'Cassava__brown_streak_disease': {'disease_name': 'Cassava Brown Streak Disease',
                                   'crop': 'Cassava',
                                   'description': 'A viral disease that can affect cassava leaves, '
                                                  'stems and storage roots.',
                                   'symptoms': ['Yellow or feathery chlorosis and mottling can '
                                                'occur on leaves.',
                                                'Brown streaks may develop on stems and brown or '
                                                'black necrotic areas can develop inside storage '
                                                'roots.'],
                                   'favourable_conditions': [],
                                   'recommended_actions': ['Use healthy planting material and '
                                                           'monitor plants for leaf, stem and root '
                                                           'symptoms.',
                                                           'Seek local diagnostic confirmation '
                                                           'because symptoms can vary.'],
                                   'prevention': ['Use clean planting material and avoid '
                                                  'propagating from symptomatic plants.'],
                                   'source': {'organization': 'Peer-reviewed agricultural research',
                                              'title': 'Cassava brown streak disease: historical '
                                                       'timeline, current knowledge and future '
                                                       'prospects',
                                              'source_type': 'Research reference',
                                              'url': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5947582/'},
                                   'verification_status': 'general_reference'},
 'Cassava__green_mottle': {'disease_name': 'Cassava Green Mottle',
                           'crop': 'Cassava',
                           'description': 'A viral disease associated with mottling and '
                                          'deformation of cassava foliage.',
                           'symptoms': ['Light and dark green mottling can appear on leaves.',
                                        'Affected leaves may show distortion or reduced growth.'],
                           'favourable_conditions': [],
                           'recommended_actions': ['Monitor new growth for characteristic mottling '
                                                   'and compare with healthy plants.',
                                                   'Use clean planting material when replacing '
                                                   'affected plants.'],
                           'prevention': ['Use healthy planting material and remove visibly '
                                          'infected propagation material.'],
                           'source': {'organization': 'IITA',
                                      'title': 'Cassava research and crop protection resources',
                                      'source_type': 'International agricultural research '
                                                     'reference',
                                      'url': 'https://www.iita.org/research/'},
                           'verification_status': 'general_reference'},
 'Cassava__healthy': {'disease_name': 'Cassava Healthy',
                      'crop': 'Cassava',
                      'description': '',
                      'symptoms': [],
                      'favourable_conditions': [],
                      'recommended_actions': [],
                      'prevention': [],
                      'source': None,
                      'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Cassava__mosaic_disease': {'disease_name': 'Cassava Mosaic Disease',
                             'crop': 'Cassava',
                             'description': 'A group of viral diseases that cause characteristic '
                                            'mosaic and leaf distortion in cassava.',
                             'symptoms': ['Leaves show contrasting light and dark green mosaic '
                                          'patterns.',
                                          'Leaves may become distorted, narrowed or reduced in '
                                          'size, and plants may be stunted.'],
                             'favourable_conditions': [],
                             'recommended_actions': ['Use healthy planting material and monitor '
                                                     'for mosaic symptoms.',
                                                     'Remove severely affected propagation '
                                                     'material rather than using it for the next '
                                                     'crop.'],
                             'prevention': ['Use healthy cuttings and locally recommended '
                                            'resistant varieties where available.'],
                             'source': {'organization': 'IITA',
                                        'title': 'Cassava research and crop protection resources',
                                        'source_type': 'International agricultural research '
                                                       'reference',
                                        'url': 'https://www.iita.org/research/'},
                             'verification_status': 'general_reference'},
 'Corn__common_rust': {'disease_name': 'Corn Common Rust',
                       'crop': 'Corn',
                       'description': 'A fungal rust disease that produces reddish-brown pustules '
                                      'on corn leaves.',
                       'symptoms': ['Small cinnamon to reddish-brown pustules develop on both '
                                    'sides of leaves.',
                                    'Heavy infection can cause premature leaf drying.'],
                       'favourable_conditions': ['Cool to moderate temperatures and moist leaf '
                                                 'surfaces favour infection.'],
                       'recommended_actions': ['Scout leaves regularly and monitor disease '
                                               'progression.',
                                               'Use locally recommended resistant hybrids and '
                                               'management practices.'],
                       'prevention': ['Use resistant hybrids where available and maintain good '
                                      'crop monitoring.'],
                       'source': {'organization': 'Purdue Extension',
                                  'title': 'Corn Disease Management Resources',
                                  'source_type': 'University agricultural extension reference',
                                  'url': 'https://extension.purdue.edu/'},
                       'verification_status': 'general_reference'},
 'Corn__gray_leaf_spot': {'disease_name': 'Corn Gray Leaf Spot',
                          'crop': 'Corn',
                          'description': 'A fungal disease that primarily affects corn leaves.',
                          'symptoms': ['Small lesions enlarge into rectangular tan to gray-brown '
                                       'spots bounded by leaf veins.',
                                       'Severe disease can reduce green leaf area.'],
                          'favourable_conditions': ['Warm, humid weather and prolonged leaf '
                                                    'wetness favour disease development.'],
                          'recommended_actions': ['Scout lower leaves and monitor disease '
                                                  'progression.',
                                                  'Use resistant hybrids and locally recommended '
                                                  'crop-management practices.'],
                          'prevention': ['Manage infected residue and use crop rotation or '
                                         'resistant hybrids where appropriate.'],
                          'source': {'organization': 'Purdue Extension',
                                     'title': 'Corn Disease Management Resources',
                                     'source_type': 'University agricultural extension reference',
                                     'url': 'https://extension.purdue.edu/'},
                          'verification_status': 'general_reference'},
 'Corn__healthy': {'disease_name': 'Corn Healthy',
                   'crop': 'Corn',
                   'description': '',
                   'symptoms': [],
                   'favourable_conditions': [],
                   'recommended_actions': [],
                   'prevention': [],
                   'source': None,
                   'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Corn__northern_leaf_blight': {'disease_name': 'Corn Northern Leaf Blight',
                                'crop': 'Corn',
                                'description': 'A fungal disease of corn foliage.',
                                'symptoms': ['Long, cigar-shaped gray-green to tan lesions develop '
                                             'on leaves.',
                                             'Lesions can enlarge and merge, reducing '
                                             'photosynthetic leaf area.'],
                                'favourable_conditions': ['Cool, humid and wet conditions favour '
                                                          'disease development.'],
                                'recommended_actions': ['Scout fields for characteristic '
                                                        'cigar-shaped lesions.',
                                                        'Use resistant hybrids and follow local '
                                                        'extension recommendations.'],
                                'prevention': ['Manage crop residue and use resistant hybrids '
                                               'where available.'],
                                'source': {'organization': 'Purdue Extension',
                                           'title': 'Corn Disease Management Resources',
                                           'source_type': 'University agricultural extension '
                                                          'reference',
                                           'url': 'https://extension.purdue.edu/'},
                                'verification_status': 'general_reference'},
 'Potato__early_blight': {'disease_name': 'Potato Early Blight',
                          'crop': 'Potato',
                          'description': 'A fungal disease caused by Alternaria solani that '
                                         'commonly affects older potato foliage.',
                          'symptoms': ['Circular to angular dark-brown leaf lesions, often with '
                                       'concentric rings producing a target-board appearance; '
                                       'severe infection can cause yellowing and leaf drop.',
                                       'Infected tubers can develop brown, corky dry rot.'],
                          'favourable_conditions': ['Warm weather and wet conditions from dew, '
                                                    'rain or sprinkler irrigation favor '
                                                    'infection.'],
                          'recommended_actions': ['Maintain appropriate crop nutrition and '
                                                  'irrigation.',
                                                  'Monitor routinely and use locally appropriate '
                                                  'disease-management measures when disease '
                                                  'develops.'],
                          'prevention': ['Manage crop residue and volunteer/solanaceous hosts '
                                         'where appropriate.',
                                         'Maintain crop vigor and avoid unnecessary prolonged leaf '
                                         'wetness.'],
                          'source': {'organization': 'UC IPM',
                                     'title': 'Early Blight — Potato Pest Management Guidelines',
                                     'source_type': 'University agricultural extension/IPM',
                                     'url': 'https://ipm.ucanr.edu/agriculture/potato/early-blight/'},
                          'verification_status': 'verified'},
 'Potato__healthy': {'disease_name': 'Potato Healthy',
                     'crop': 'Potato',
                     'description': '',
                     'symptoms': [],
                     'favourable_conditions': [],
                     'recommended_actions': [],
                     'prevention': [],
                     'source': None,
                     'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Potato__late_blight': {'disease_name': 'Potato Late Blight',
                         'crop': 'Potato',
                         'description': 'A destructive potato disease caused by Phytophthora '
                                        'infestans that can affect foliage and tubers.',
                         'symptoms': ['Pale to dark-green water-soaked irregular leaf spots can '
                                      'expand and become brown to purplish-black.',
                                      'White sporulation may appear at lesion margins under '
                                      'sufficiently humid conditions.',
                                      'Infected tubers can develop firm brown decay.'],
                         'favourable_conditions': ['High humidity above 90% and average '
                                                   'temperatures around 50–78°F (10–26°C) favor '
                                                   'disease development.'],
                         'recommended_actions': ['Inspect crops frequently when conditions favor '
                                                 'disease.',
                                                 'Manage cull piles and volunteer potatoes.',
                                                 'Use certified seed tubers and follow local '
                                                 'extension guidance for fungicide decisions.'],
                         'prevention': ['Good field sanitation, proper harvesting/storage '
                                        'practices and foliage-drying practices reduce risk.'],
                         'source': {'organization': 'UC IPM',
                                    'title': 'Late Blight — Potato Pest Management Guidelines',
                                    'source_type': 'University agricultural extension/IPM',
                                    'url': 'https://ipm.ucanr.edu/agriculture/potato/late-blight/'},
                         'verification_status': 'verified'},
 'Rice__brown_spot': {'disease_name': 'Rice Brown Spot',
                      'crop': 'Rice',
                      'description': 'A fungal disease of rice; TNAU identifies it as a seed-borne '
                                     'disease associated with brown leaf and grain spotting.',
                      'symptoms': ['Round, oval or irregular brown spots can develop on leaves and '
                                   'may coalesce, causing tissue withering.',
                                   'Browning or greyish-brown symptoms can occur near the neck and '
                                   'grains may show reddish-brown discoloration.'],
                      'favourable_conditions': [],
                      'recommended_actions': ['Use healthy seed and follow locally recommended '
                                              'rice disease-management practices.'],
                      'prevention': ['Use healthy planting seed and maintain appropriate crop '
                                     'management.'],
                      'source': {'organization': 'TNAU Agritech Portal',
                                 'title': 'Disease Management of Agricultural Crops — Rice Brown '
                                          'Leaf Spot',
                                 'source_type': 'Agricultural university extension',
                                 'url': 'https://agritech.tnau.ac.in/org_farm/orgfarm_prac_agri_paddy_diseases.html'},
                      'verification_status': 'verified'},
 'Rice__healthy': {'disease_name': 'Rice Healthy',
                   'crop': 'Rice',
                   'description': '',
                   'symptoms': [],
                   'favourable_conditions': [],
                   'recommended_actions': [],
                   'prevention': [],
                   'source': None,
                   'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Rice__hispa': {'disease_name': 'Rice Hispa',
                 'crop': 'Rice',
                 'description': 'An insect pest of rice; the adult and grub feed on green leaf '
                                'tissue.',
                 'symptoms': ['Grubs mine leaves and adults scrape the upper leaf surface, leaving '
                              'white streaks parallel to the midrib.',
                              'Larval feeding can produce irregular translucent white patches; '
                              'heavily damaged leaves may wither.'],
                 'favourable_conditions': [],
                 'recommended_actions': ['Monitor young rice plants for mines and beetles.',
                                         'Remove or destroy heavily mined leaf tips where '
                                         'practical.',
                                         'Use locally recommended integrated pest-management '
                                         'measures when intervention is warranted.'],
                 'prevention': ['Avoid over-fertilization and maintain regular field monitoring.'],
                 'source': {'organization': 'TNAU Agritech Portal',
                            'title': 'Rice Hispa — Crop Protection',
                            'source_type': 'Agricultural university extension',
                            'url': 'https://agritech.tnau.ac.in/expert_system/paddy/cppests_ricehispa.html'},
                 'verification_status': 'verified'},
 'Rice__leaf_blast': {'disease_name': 'Rice Leaf Blast',
                      'crop': 'Rice',
                      'description': 'A rice blast disease caused by Pyricularia oryzae.',
                      'symptoms': ['Spindle-shaped leaf lesions with grey centres and brown '
                                   'margins can develop.',
                                   'Severe infection can give the crop a blasted or burnt '
                                   'appearance.'],
                      'favourable_conditions': [],
                      'recommended_actions': ['Monitor leaves for characteristic blast lesions and '
                                              'follow local rice-blast management '
                                              'recommendations.'],
                      'prevention': ['Use healthy seed and manage infected crop residue according '
                                     'to local recommendations.'],
                      'source': {'organization': 'TNAU Agritech Portal',
                                 'title': 'Blast — Crop Protection',
                                 'source_type': 'Agricultural university extension',
                                 'url': 'https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html'},
                      'verification_status': 'verified'},
 'Rice__neck_blast': {'disease_name': 'Rice Neck Blast',
                      'crop': 'Rice',
                      'description': 'A form of rice blast affecting the neck region of the '
                                     'panicle.',
                      'symptoms': ['The neck region can become black and shrivel; grain set may be '
                                   'inhibited and the panicle can break at the neck and hang.'],
                      'favourable_conditions': [],
                      'recommended_actions': ['Inspect panicle necks during the relevant crop '
                                              'stage and follow local blast-management '
                                              'recommendations.'],
                      'prevention': ['Use healthy seed and manage infected crop residue according '
                                     'to local recommendations.'],
                      'source': {'organization': 'TNAU Agritech Portal',
                                 'title': 'Blast — Crop Protection',
                                 'source_type': 'Agricultural university extension',
                                 'url': 'https://agritech.tnau.ac.in/expert_system/paddy/cpdisblast.html'},
                      'verification_status': 'verified'},
 'Sugarcane__bacterial_blight': {'disease_name': 'Sugarcane Bacterial Blight',
                                 'crop': 'Sugarcane',
                                 'description': 'A bacterial disease that can cause leaf and stalk '
                                                'symptoms in sugarcane.',
                                 'symptoms': ['Water-soaked or necrotic leaf lesions can develop '
                                              'and affected tissue may dry and die.',
                                              'Severe infections can cause leaf or shoot decline.'],
                                 'favourable_conditions': ['Warm, humid and wet conditions can '
                                                           'favour bacterial disease development '
                                                           'and spread.'],
                                 'recommended_actions': ['Remove or avoid propagating from '
                                                         'severely affected planting material.',
                                                         'Monitor fields and follow local '
                                                         'sugarcane disease-management guidance.'],
                                 'prevention': ['Use healthy planting material and maintain field '
                                                'sanitation.'],
                                 'source': {'organization': 'TNAU Agritech Portal',
                                            'title': 'Sugarcane Crop Protection Resources',
                                            'source_type': 'Agricultural university extension '
                                                           'reference',
                                            'url': 'https://agritech.tnau.ac.in/'},
                                 'verification_status': 'general_reference'},
 'Sugarcane__healthy': {'disease_name': 'Sugarcane Healthy',
                        'crop': 'Sugarcane',
                        'description': '',
                        'symptoms': [],
                        'favourable_conditions': [],
                        'recommended_actions': [],
                        'prevention': [],
                        'source': None,
                        'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Sugarcane__red_rot': {'disease_name': 'Sugarcane Red Rot',
                        'crop': 'Sugarcane',
                        'description': 'A major sugarcane disease caused by Colletotrichum '
                                       'falcatum.',
                        'symptoms': ['Young leaves may change from green to orange and yellow, '
                                     'with drying progressing from the bottom upward.',
                                     'Affected canes can show longitudinal discoloration; when '
                                     'split, the internal tissue can be reddish with intermittent '
                                     'white areas.'],
                        'favourable_conditions': [],
                        'recommended_actions': ['Use healthy planting material and follow local '
                                                'red-rot management recommendations.',
                                                'Where disease is established, follow locally '
                                                'recommended rotation and sanitation practices.'],
                        'prevention': ['Use healthy planting material and appropriate crop '
                                       'rotation/sanitation.'],
                        'source': {'organization': 'TNAU Agritech Portal',
                                   'title': 'Sugarcane Red Rot',
                                   'source_type': 'Agricultural university extension',
                                   'url': 'https://agritech.tnau.ac.in/govt_schemes_services/aas/sugarcane_ex.html'},
                        'verification_status': 'verified'},
 'Tea__algal_leaf': {'disease_name': 'Tea Algal Leaf Disease',
                     'crop': 'Tea',
                     'description': 'A foliar disease associated with algal growth on tea leaves '
                                    'and shoots.',
                     'symptoms': ['Small greenish or reddish circular patches can appear on leaves '
                                  'and may become more conspicuous as they develop.'],
                     'favourable_conditions': ['Humid, wet conditions and prolonged surface '
                                               'moisture favour algal growth.'],
                     'recommended_actions': ['Monitor affected leaves and improve plantation '
                                             'airflow and general canopy management where '
                                             'practical.'],
                     'prevention': ['Maintain good plantation sanitation and canopy conditions.'],
                     'source': {'organization': 'Tea Research Association Tocklai',
                                'title': 'Tea plant protection resources',
                                'source_type': 'Tea research and extension reference',
                                'url': 'https://tocklai.org/'},
                     'verification_status': 'general_reference'},
 'Tea__anthracnose': {'disease_name': 'Tea Anthracnose',
                      'crop': 'Tea',
                      'description': 'A fungal disease that can cause necrotic lesions on tea '
                                     'leaves and shoots.',
                      'symptoms': ['Brown to dark necrotic leaf spots may enlarge and cause leaf '
                                   'tissue to die.',
                                   'Severe infection can affect young shoots.'],
                      'favourable_conditions': ['Warm, humid and wet conditions favour fungal '
                                                'infection.'],
                      'recommended_actions': ['Monitor young leaves and shoots during wet weather.',
                                              'Remove severely affected material where practical '
                                              'and follow local tea-extension guidance.'],
                      'prevention': ['Maintain plantation sanitation and avoid prolonged wetness '
                                     'where practical.'],
                      'source': {'organization': 'Tea Research Association Tocklai',
                                 'title': 'Tea plant protection resources',
                                 'source_type': 'Tea research and extension reference',
                                 'url': 'https://tocklai.org/'},
                      'verification_status': 'general_reference'},
 'Tea__bird_eye_spot': {'disease_name': "Tea Bird's Eye Spot",
                        'crop': 'Tea',
                        'description': 'A foliar spot disease of tea characterized by small '
                                       'circular lesions.',
                        'symptoms': ['Small circular spots can develop on leaves, often with a '
                                     'distinct centre and darker margin.'],
                        'favourable_conditions': ['Wet and humid conditions favour foliar spot '
                                                  'diseases.'],
                        'recommended_actions': ['Monitor new foliage and remove heavily affected '
                                                'material where practical.'],
                        'prevention': ['Maintain good plantation sanitation and airflow.'],
                        'source': {'organization': 'Tea Research Association Tocklai',
                                   'title': 'Tea plant protection resources',
                                   'source_type': 'Tea research and extension reference',
                                   'url': 'https://tocklai.org/'},
                        'verification_status': 'general_reference'},
 'Tea__brown_blight': {'disease_name': 'Tea Brown Blight',
                       'crop': 'Tea',
                       'description': 'A foliar disease that produces brown necrotic lesions on '
                                      'tea leaves.',
                       'symptoms': ['Brown irregular or rounded lesions can enlarge and cause '
                                    'affected leaf tissue to die.'],
                       'favourable_conditions': ['Warm, humid and wet conditions can favour foliar '
                                                 'blight development.'],
                       'recommended_actions': ['Scout foliage regularly and remove heavily '
                                               'affected material where practical.'],
                       'prevention': ['Maintain sanitation and good canopy airflow.'],
                       'source': {'organization': 'Tea Research Association Tocklai',
                                  'title': 'Tea plant protection resources',
                                  'source_type': 'Tea research and extension reference',
                                  'url': 'https://tocklai.org/'},
                       'verification_status': 'general_reference'},
 'Tea__healthy': {'disease_name': 'Tea Healthy',
                  'crop': 'Tea',
                  'description': '',
                  'symptoms': [],
                  'favourable_conditions': [],
                  'recommended_actions': [],
                  'prevention': [],
                  'source': None,
                  'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Tea__red_leaf_spot': {'disease_name': 'Tea Red Leaf Spot',
                        'crop': 'Tea',
                        'description': 'A foliar spot disease that produces reddish to brown '
                                       'lesions on tea leaves.',
                        'symptoms': ['Reddish or reddish-brown spots can develop on leaves and may '
                                     'enlarge as disease progresses.'],
                        'favourable_conditions': ['Wet and humid conditions favour foliar disease '
                                                  'development.'],
                        'recommended_actions': ['Monitor foliage and remove severely affected '
                                                'material where practical.'],
                        'prevention': ['Maintain plantation sanitation and good airflow.'],
                        'source': {'organization': 'Tea Research Association Tocklai',
                                   'title': 'Tea plant protection resources',
                                   'source_type': 'Tea research and extension reference',
                                   'url': 'https://tocklai.org/'},
                        'verification_status': 'general_reference'},
 'Tomato__bacterial_spot': {'disease_name': 'Tomato Bacterial Spot',
                            'crop': 'Tomato',
                            'description': 'A bacterial disease affecting tomato leaves and fruit.',
                            'symptoms': ['On older plants, water-soaked areas on leaves can become '
                                         'yellow or light green and then black or dark brown.',
                                         'Immature fruit can develop slightly sunken spots that '
                                         'enlarge and become brown and scabby.'],
                            'favourable_conditions': [],
                            'recommended_actions': ['Use healthy seed/transplants and avoid moving '
                                                    'contaminated material between plants.',
                                                    'Follow local integrated disease-management '
                                                    'recommendations.'],
                            'prevention': ['Use pathogen-free planting material and good '
                                           'sanitation.'],
                            'source': {'organization': 'UC IPM',
                                       'title': 'Bacterial Spot — Tomato Pest Management '
                                                'Guidelines',
                                       'source_type': 'University agricultural extension/IPM',
                                       'url': 'https://ipm.ucanr.edu/agriculture/tomato/bacterial-spot/'},
                            'verification_status': 'verified'},
 'Tomato__early_blight': {'disease_name': 'Tomato Early Blight',
                          'crop': 'Tomato',
                          'description': 'A fungal disease caused by Alternaria solani that '
                                         'commonly begins on lower tomato leaves.',
                          'symptoms': ['Dark brown spots that enlarge and develop concentric rings '
                                       'can appear on leaves.',
                                       'Stems and fruit can also develop dark, sunken lesions with '
                                       'concentric rings.'],
                          'favourable_conditions': ['Warm, humid weather with heavy dew or rain '
                                                    'and leaf wetness favors infection.'],
                          'recommended_actions': ['Monitor lower leaves for characteristic '
                                                  'concentric-ring lesions.',
                                                  'Remove affected plant material where '
                                                  'appropriate and follow local integrated '
                                                  'disease-management guidance.'],
                          'prevention': ['Use appropriate sanitation and reduce prolonged leaf '
                                         'wetness; use locally suitable varieties where '
                                         'available.'],
                          'source': {'organization': 'University of Connecticut Extension',
                                     'title': 'Early Blight of Tomato',
                                     'source_type': 'University agricultural extension/IPM',
                                     'url': 'https://ipm.cahnr.uconn.edu/tomato-early-blight/'},
                          'verification_status': 'verified'},
 'Tomato__healthy': {'disease_name': 'Tomato Healthy',
                     'crop': 'Tomato',
                     'description': '',
                     'symptoms': [],
                     'favourable_conditions': [],
                     'recommended_actions': [],
                     'prevention': [],
                     'source': None,
                     'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Tomato__late_blight': {'disease_name': 'Tomato Late Blight',
                         'crop': 'Tomato',
                         'description': 'A disease caused by Phytophthora infestans that can '
                                        'rapidly damage tomato foliage, stems and fruit.',
                         'symptoms': ['Irregular water-soaked spots on leaves can enlarge and '
                                      'become dark brown or black.',
                                      'White growth may appear under humid conditions; stems can '
                                      'develop brown lesions and fruit can develop firm, sunken '
                                      'spots.'],
                         'favourable_conditions': ['Cool, wet conditions and high humidity favor '
                                                   'disease development.'],
                         'recommended_actions': ['Monitor crops closely during cool, wet weather.',
                                                 'Improve airflow and sanitation and follow '
                                                 'locally appropriate late-blight management '
                                                 'guidance.'],
                         'prevention': ['Use crop rotation and sanitation practices and avoid '
                                        'conditions that keep foliage wet for prolonged periods.'],
                         'source': {'organization': 'University of Connecticut Extension',
                                    'title': 'Late Blight of Tomato',
                                    'source_type': 'University agricultural extension/IPM',
                                    'url': 'https://ipm.cahnr.uconn.edu/tomato-late-blight/'},
                         'verification_status': 'verified'},
 'Tomato__leaf_mold': {'disease_name': 'Tomato Leaf Mold',
                       'crop': 'Tomato',
                       'description': 'A fungal disease caused by Passalora fulva that primarily '
                                      'affects tomato foliage under humid conditions.',
                       'symptoms': ['Pale green to yellowish spots develop on upper leaf surfaces.',
                                    'A velvety olive-green to brown mold can develop on the '
                                    'underside of leaves; severe disease can cause leaf death and '
                                    'drop.'],
                       'favourable_conditions': ['Humidity above about 85%, temperatures around '
                                                 '68–77°F (20–25°C), and prolonged leaf wetness '
                                                 'favor disease development.'],
                       'recommended_actions': ['Improve air circulation and ventilation.',
                                               'Avoid overhead watering where practical and remove '
                                               'infected plant material.'],
                       'prevention': ['Maintain spacing and airflow, reduce humidity, sanitize '
                                      'tools/structures and remove infected debris.'],
                       'source': {'organization': 'University of Connecticut Extension',
                                  'title': 'Tomato Leaf Mold',
                                  'source_type': 'University agricultural extension/IPM',
                                  'url': 'https://ipm.cahnr.uconn.edu/tomato-leaf-mold/'},
                       'verification_status': 'verified'},
 'Tomato__mosaic_virus': {'disease_name': 'Tomato Mosaic Virus',
                          'crop': 'Tomato',
                          'description': 'A viral disease in the tobamovirus group that can affect '
                                         'tomato leaves and fruit.',
                          'symptoms': ['Mosaic patterns and leaf malformation can occur; necrotic '
                                       'patterns may also develop on fruit.'],
                          'favourable_conditions': [],
                          'recommended_actions': ['Use treated/healthy seed and maintain strict '
                                                  'sanitation when handling plants.'],
                          'prevention': ['Use healthy planting material and sanitize hands, tools '
                                         'and equipment.'],
                          'source': {'organization': 'UC IPM',
                                     'title': 'Tobacco Mosaic — Tomato Pest Management Guidelines',
                                     'source_type': 'University agricultural extension/IPM',
                                     'url': 'https://ipm.ucanr.edu/agriculture/tomato/tobacco-mosaic/'},
                          'verification_status': 'verified'},
 'Tomato__septoria_leaf_spot': {'disease_name': 'Tomato Septoria Leaf Spot',
                                'crop': 'Tomato',
                                'description': 'A fungal disease caused by Septoria lycopersici '
                                               'that typically starts on lower, older leaves.',
                                'symptoms': ['Small water-soaked spots develop into circular '
                                             'lesions with grayish-white or tan centers and dark '
                                             'margins.',
                                             'Tiny black fruiting bodies (pycnidia) may be visible '
                                             'in lesion centers; severe infection can cause '
                                             'defoliation.'],
                                'favourable_conditions': ['Warm, wet and humid conditions favor '
                                                          'disease development.'],
                                'recommended_actions': ['Inspect lower leaves regularly, '
                                                        'especially during wet weather.',
                                                        'Remove infected leaves/debris where '
                                                        'appropriate and avoid overhead watering.'],
                                'prevention': ['Use disease-free planting material, improve '
                                               'spacing and airflow, rotate away from solanaceous '
                                               'crops, and manage infected debris.'],
                                'source': {'organization': 'University of Connecticut Extension',
                                           'title': 'Tomato Septoria Leaf Spot',
                                           'source_type': 'University agricultural extension/IPM',
                                           'url': 'https://ipm.cahnr.uconn.edu/tomato-septoria/'},
                                'verification_status': 'verified'},
 'Tomato__spider_mites_(two_spotted_spider_mite)': {'disease_name': 'Tomato Two-Spotted Spider Mite',
                                                    'crop': 'Tomato',
                                                    'description': 'A mite pest that feeds on '
                                                                   'tomato leaves and can reduce '
                                                                   'plant vigor.',
                                                    'symptoms': ['Fine pale stippling develops on '
                                                                 'leaves as mites feed.',
                                                                 'Severe infestations can cause '
                                                                 'bronzing, yellowing, leaf drying '
                                                                 'and fine webbing.'],
                                                    'favourable_conditions': ['Hot and dry '
                                                                              'conditions often '
                                                                              'favour rapid '
                                                                              'spider-mite '
                                                                              'population growth.'],
                                                    'recommended_actions': ['Inspect leaf '
                                                                            'undersides for mites '
                                                                            'and webbing.',
                                                                            'Reduce plant stress '
                                                                            'and use locally '
                                                                            'recommended '
                                                                            'integrated '
                                                                            'pest-management '
                                                                            'measures.'],
                                                    'prevention': ['Monitor regularly and avoid '
                                                                   'unnecessary practices that '
                                                                   'disrupt beneficial predatory '
                                                                   'mites.'],
                                                    'source': {'organization': 'UC IPM',
                                                               'title': 'Spider Mites — Tomato '
                                                                        'Pest Management '
                                                                        'Guidelines',
                                                               'source_type': 'University '
                                                                              'agricultural '
                                                                              'extension/IPM',
                                                               'url': 'https://ipm.ucanr.edu/agriculture/tomato/'},
                                                    'verification_status': 'general_reference'},
 'Tomato__target_spot': {'disease_name': 'Tomato Target Spot',
                         'crop': 'Tomato',
                         'description': 'A fungal disease that affects tomato leaves and fruit and '
                                        'can produce characteristic target-like lesions.',
                         'symptoms': ['Brown circular lesions with concentric rings can develop on '
                                      'leaves.',
                                      'Fruit may develop sunken brown lesions, often near the '
                                      'stem.'],
                         'favourable_conditions': ['Warm, humid conditions and prolonged leaf '
                                                   'wetness favour disease development.'],
                         'recommended_actions': ['Scout foliage and fruit regularly, especially '
                                                 'during humid weather.',
                                                 'Remove infected plant material where practical '
                                                 'and follow local extension guidance.'],
                         'prevention': ['Improve airflow, reduce prolonged leaf wetness and '
                                        'maintain sanitation.'],
                         'source': {'organization': 'UF/IFAS Extension',
                                    'title': 'Tomato Disease Management Resources',
                                    'source_type': 'University agricultural extension reference',
                                    'url': 'https://edis.ifas.ufl.edu/'},
                         'verification_status': 'general_reference'},
 'Tomato__yellow_leaf_curl_virus': {'disease_name': 'Tomato Yellow Leaf Curl Virus',
                                    'crop': 'Tomato',
                                    'description': 'A viral disease caused by Tomato yellow leaf '
                                                   'curl virus (TYLCV).',
                                    'symptoms': ['Small leaves curl upward and show crumpling and '
                                                 'interveinal/marginal yellowing.',
                                                 'Internodes become shortened and plants may '
                                                 'become stunted and bushy; flowers may fail to '
                                                 'develop and fruit production can be greatly '
                                                 'reduced.'],
                                    'favourable_conditions': [],
                                    'recommended_actions': ['Use virus- and whitefly-free '
                                                            'transplants.',
                                                            'Monitor and manage whiteflies using '
                                                            'locally appropriate integrated '
                                                            'pest-management practices.',
                                                            'Rogue diseased plants when '
                                                            'appropriate.'],
                                    'prevention': ['Use resistant varieties where available, '
                                                   'healthy transplants, whitefly management and '
                                                   'good weed/crop-residue management.'],
                                    'source': {'organization': 'UC IPM',
                                               'title': 'Tomato Yellow Leaf Curl — Tomato Pest '
                                                        'Management Guidelines',
                                               'source_type': 'University agricultural '
                                                              'extension/IPM',
                                               'url': 'https://ipm.ucanr.edu/agriculture/tomato/tomato-yellow-leaf-curl/'},
                                    'verification_status': 'verified'},
 'Wheat__brown_rust': {'disease_name': 'Wheat Brown Rust (Leaf Rust)',
                       'crop': 'Wheat',
                       'description': 'A wheat rust disease characterized by rust-colored pustules '
                                      'on leaves.',
                       'symptoms': ['Rust-colored pustules occur on wheat leaves; PPQS material '
                                    'describes pustules and spore production associated with leaf '
                                    'rust.'],
                       'favourable_conditions': [],
                       'recommended_actions': ['Monitor fields regularly and follow locally '
                                               'recommended rust-management guidance when symptoms '
                                               'are confirmed.'],
                       'prevention': ['Use locally recommended resistant varieties and monitor '
                                      'crops during periods favorable to rust development.'],
                       'source': {'organization': 'PPQS, Government of India',
                                  'title': 'Wheat Rust',
                                  'source_type': 'Government agricultural advisory',
                                  'url': 'https://ppqs.gov.in/sites/default/files/wheat_rust-english.pdf'},
                       'verification_status': 'verified'},
 'Wheat__healthy': {'disease_name': 'Wheat Healthy',
                    'crop': 'Wheat',
                    'description': '',
                    'symptoms': [],
                    'favourable_conditions': [],
                    'recommended_actions': [],
                    'prevention': [],
                    'source': None,
                    'verification_status': 'healthy_class_no_disease_knowledge_required'},
 'Wheat__yellow_rust': {'disease_name': 'Wheat Yellow Rust (Stripe Rust)',
                        'crop': 'Wheat',
                        'description': 'A wheat rust disease caused by Puccinia striiformis f. sp. '
                                       'tritici.',
                        'symptoms': ['Yellow-orange pustules form in noticeable stripes on mature '
                                     'leaves.',
                                     'Later, black telia can occur in stripes and infected tissue '
                                     'can become brown and dry.'],
                        'favourable_conditions': ['Yellow rust has a lower optimum temperature '
                                                  'than some other wheat rusts and is important '
                                                  'during winter/early spring or at higher '
                                                  'elevations.'],
                        'recommended_actions': ['Monitor fields during susceptible crop stages and '
                                                'follow local yellow-rust management '
                                                'recommendations.'],
                        'prevention': ['Use locally recommended resistant varieties and timely '
                                       'monitoring.'],
                        'source': {'organization': 'PPQS, Government of India',
                                   'title': 'IPM Package of Practices (POP) for Management of '
                                            'Yellow Rust of Wheat',
                                   'source_type': 'Government agricultural advisory',
                                   'url': 'https://ppqs.gov.in/sites/default/files/pop_for_management_of_yellow_rust_of_wheat.pdf'},
                        'verification_status': 'verified'}}
