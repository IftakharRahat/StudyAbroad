import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type StarterCountry = {
  name: string;
  averageLivingCostUsd: number;
  postStudyWorkVisaMonths: number;
  partTimeWorkHours: number;
  visaDifficulty: string;
  languageRequirement: string;
  safetyScore: number;
  notes: string;
  universities: Array<{
    name: string;
    city: string;
    rankingBand: string;
    acceptanceDifficulty: number;
    websiteUrl: string;
    program: {
      title: string;
      field: string;
      tuitionUsd: number;
      minCgpa: number;
      minIelts: number;
      minGre?: number;
      researchPreferred?: boolean;
      workExperiencePreferred?: boolean;
      deadline: string;
    };
  }>;
};

type StarterScholarship = {
  name: string;
  countryName: string;
  degreeLevel: string;
  eligibleNationalities: string[];
  eligibleFields: string[];
  minCgpa: number;
  minIelts: number;
  researchRequired: boolean;
  amountUsd: number;
  coverageType: string;
  deadline: string;
  requiredDocuments: string[];
  sourceUrl: string;
};

const starterCatalog: StarterCountry[] = [
  {
    name: "Canada",
    averageLivingCostUsd: 1250,
    postStudyWorkVisaMonths: 36,
    partTimeWorkHours: 24,
    visaDifficulty: "Medium",
    languageRequirement: "English or French",
    safetyScore: 8.7,
    notes: "Strong post-study work pathway and broad scholarship options, with higher costs in Toronto and Vancouver.",
    universities: [
      program("University of Toronto", "Toronto", "Top-tier", 9, "MSc Applied Computing", 47000, 3.7, 7, "https://www.utoronto.ca", "2027-01-15", 315, true, true),
      program("University of British Columbia", "Vancouver", "Top-tier", 8, "MSc Computer Science", 36000, 3.5, 7, "https://www.ubc.ca", "2027-01-31", 312, true),
      program("McGill University", "Montreal", "Top-tier", 8, "MSc Computer Science", 30000, 3.4, 6.5, "https://www.mcgill.ca", "2027-02-01", 310, true),
      program("University of Waterloo", "Waterloo", "Top-tier", 8, "Master of Data Science and Artificial Intelligence", 34500, 3.5, 7, "https://uwaterloo.ca", "2027-02-15", 315, true, true),
      program("University of Alberta", "Edmonton", "Mid-tier", 7, "MSc Computing Science", 21000, 3.2, 6.5, "https://www.ualberta.ca", "2027-03-01", 305, true),
      program("University of Ottawa", "Ottawa", "Mid-tier", 6, "MSc Computer Science", 23000, 3.1, 6.5, "https://www.uottawa.ca", "2027-03-15"),
      program("University of Calgary", "Calgary", "Mid-tier", 6, "MSc Computer Science", 22000, 3.1, 6.5, "https://www.ucalgary.ca", "2027-04-01"),
      program("Concordia University", "Montreal", "Accessible-tier", 5, "MCompSc Computer Science", 19000, 3, 6.5, "https://www.concordia.ca", "2027-05-01"),
      program("Dalhousie University", "Halifax", "Accessible-tier", 5, "Master of Applied Computer Science", 18000, 2.9, 6.5, "https://www.dal.ca", "2027-05-15", undefined, false, true),
      program("Memorial University of Newfoundland", "St. John's", "Accessible-tier", 4, "MSc Computer Science", 12000, 2.8, 6, "https://www.mun.ca", "2027-06-01")
    ]
  },
  {
    name: "Australia",
    averageLivingCostUsd: 1500,
    postStudyWorkVisaMonths: 36,
    partTimeWorkHours: 24,
    visaDifficulty: "Medium",
    languageRequirement: "English",
    safetyScore: 8.5,
    notes: "Popular destination with strong post-study work options and high living costs in major cities.",
    universities: [
      program("University of Melbourne", "Melbourne", "Top-tier", 9, "Master of Information Systems", 36500, 3.5, 7, "https://www.unimelb.edu.au", "2027-01-31", 315, true, true),
      program("Australian National University", "Canberra", "Top-tier", 8, "Master of Computing", 34000, 3.4, 6.5, "https://www.anu.edu.au", "2027-02-15", 310, true),
      program("University of Sydney", "Sydney", "Top-tier", 8, "Master of Data Science", 39000, 3.4, 7, "https://www.sydney.edu.au", "2027-01-20", 310, true),
      program("UNSW Sydney", "Sydney", "Top-tier", 8, "Master of Information Technology", 37000, 3.3, 6.5, "https://www.unsw.edu.au", "2027-02-10", 305, false, true),
      program("Monash University", "Melbourne", "Mid-tier", 7, "Master of Artificial Intelligence", 33000, 3.2, 6.5, "https://www.monash.edu", "2027-03-01", 300, true),
      program("University of Queensland", "Brisbane", "Mid-tier", 7, "Master of Cyber Security", 31500, 3.1, 6.5, "https://www.uq.edu.au", "2027-02-28"),
      program("University of Adelaide", "Adelaide", "Mid-tier", 6, "Master of Computer Science", 28500, 3, 6.5, "https://www.adelaide.edu.au", "2027-04-15"),
      program("RMIT University", "Melbourne", "Accessible-tier", 5, "Master of Information Technology", 26000, 2.8, 6.5, "https://www.rmit.edu.au", "2027-05-30", undefined, false, true),
      program("Deakin University", "Geelong", "Accessible-tier", 4, "Master of Data Analytics", 24500, 2.8, 6.5, "https://www.deakin.edu.au", "2027-06-15"),
      program("Swinburne University of Technology", "Melbourne", "Accessible-tier", 4, "Master of Cybersecurity", 23500, 2.7, 6, "https://www.swinburne.edu.au", "2027-06-30")
    ]
  },
  {
    name: "Belgium",
    averageLivingCostUsd: 1100,
    postStudyWorkVisaMonths: 12,
    partTimeWorkHours: 20,
    visaDifficulty: "Medium",
    languageRequirement: "English for many graduate programs; local language useful",
    safetyScore: 8.2,
    notes: "Good central European option with several English-taught graduate programs.",
    universities: [
      program("KU Leuven", "Leuven", "Top-tier", 8, "Master of Artificial Intelligence", 7600, 3.4, 7, "https://www.kuleuven.be", "2027-03-01", 310, true),
      program("Ghent University", "Ghent", "Top-tier", 7, "Master of Science in Computer Science Engineering", 6800, 3.3, 6.5, "https://www.ugent.be", "2027-03-15", 305, true),
      program("Vrije Universiteit Brussel", "Brussels", "Mid-tier", 6, "Master of Applied Computer Science", 5200, 3.1, 6.5, "https://www.vub.be", "2027-04-01"),
      program("University of Antwerp", "Antwerp", "Mid-tier", 6, "Master of Computer Science", 5600, 3.1, 6.5, "https://www.uantwerpen.be", "2027-04-15"),
      program("Hasselt University", "Hasselt", "Mid-tier", 5, "Master of Statistics and Data Science", 4200, 3, 6.5, "https://www.uhasselt.be", "2027-05-01", undefined, true),
      program("University of Liege", "Liege", "Mid-tier", 5, "Master in Computer Science", 3900, 3, 6, "https://www.uliege.be", "2027-05-15"),
      program("UCLouvain", "Louvain-la-Neuve", "Mid-tier", 6, "Master in Data Science", 5000, 3.1, 6.5, "https://uclouvain.be", "2027-04-30", 300, true),
      program("University of Mons", "Mons", "Accessible-tier", 4, "Master in Computer Science", 3300, 2.8, 6, "https://web.umons.ac.be", "2027-06-01"),
      program("Vlerick Business School", "Brussels", "Accessible-tier", 5, "Masters in Digital Transformation", 17000, 3, 6.5, "https://www.vlerick.com", "2027-05-30", undefined, false, true),
      program("Thomas More University of Applied Sciences", "Mechelen", "Accessible-tier", 4, "Applied Computer Science Graduate Pathway", 2600, 2.7, 6, "https://www.thomasmore.be", "2027-06-20")
    ]
  },
  {
    name: "Germany",
    averageLivingCostUsd: 1050,
    postStudyWorkVisaMonths: 18,
    partTimeWorkHours: 20,
    visaDifficulty: "Medium",
    languageRequirement: "English for many graduate programs; German helpful for jobs",
    safetyScore: 8.4,
    notes: "Lower tuition options with strong engineering, AI, and computer science programs.",
    universities: [
      program("Technical University of Munich", "Munich", "Top-tier", 9, "MSc Informatics", 6500, 3.6, 6.5, "https://www.tum.de", "2027-05-31", 315, true),
      program("RWTH Aachen University", "Aachen", "Top-tier", 8, "MSc Data Science", 5500, 3.4, 6.5, "https://www.rwth-aachen.de", "2027-03-01", 310, true),
      program("University of Bonn", "Bonn", "Top-tier", 7, "MSc Autonomous Systems", 4200, 3.3, 6.5, "https://www.uni-bonn.de", "2027-04-15", 305, true),
      program("Saarland University", "Saarbrucken", "Mid-tier", 6, "MSc Data Science and Artificial Intelligence", 4500, 3.2, 6.5, "https://www.uni-saarland.de", "2027-05-15", undefined, true),
      program("University of Stuttgart", "Stuttgart", "Mid-tier", 6, "MSc Computer Science", 4800, 3.1, 6.5, "https://www.uni-stuttgart.de", "2027-05-30"),
      program("TU Darmstadt", "Darmstadt", "Mid-tier", 6, "MSc Distributed Software Systems", 4200, 3.1, 6.5, "https://www.tu-darmstadt.de", "2027-04-30", 300),
      program("FAU Erlangen-Nurnberg", "Erlangen", "Mid-tier", 5, "MSc Artificial Intelligence", 3500, 3, 6.5, "https://www.fau.eu", "2027-05-31", undefined, true),
      program("University of Passau", "Passau", "Accessible-tier", 4, "MSc Computer Science", 2500, 2.8, 6, "https://www.uni-passau.de", "2027-06-30"),
      program("Hochschule Fulda", "Fulda", "Accessible-tier", 4, "MSc Global Software Development", 2200, 2.7, 6, "https://www.hs-fulda.de", "2027-07-15", undefined, false, true),
      program("SRH Berlin University of Applied Sciences", "Berlin", "Accessible-tier", 4, "MSc Computer Science", 9500, 2.7, 6.5, "https://www.srh-berlin.de", "2027-07-31", undefined, false, true)
    ]
  },
  {
    name: "Poland",
    averageLivingCostUsd: 720,
    postStudyWorkVisaMonths: 9,
    partTimeWorkHours: 20,
    visaDifficulty: "Medium",
    languageRequirement: "English programs available; Polish useful for jobs",
    safetyScore: 8.0,
    notes: "Affordable Central European option with a growing technology and business-services market.",
    universities: [
      program("University of Warsaw", "Warsaw", "Top-tier", 7, "MSc Computer Science", 4200, 3.2, 6.5, "https://en.uw.edu.pl", "2027-03-01", 305, true),
      program("Warsaw University of Technology", "Warsaw", "Top-tier", 7, "MSc Computer Science and Information Systems", 3900, 3.1, 6.5, "https://www.pw.edu.pl", "2027-03-15", 300),
      program("Jagiellonian University", "Krakow", "Top-tier", 7, "MSc Machine Learning", 4400, 3.2, 6.5, "https://en.uj.edu.pl", "2027-04-01", 300, true),
      program("AGH University of Krakow", "Krakow", "Mid-tier", 6, "MSc Data Science", 3600, 3, 6.5, "https://www.agh.edu.pl", "2027-04-15", undefined, true),
      program("Wroclaw University of Science and Technology", "Wroclaw", "Mid-tier", 6, "MSc Computer Engineering", 3400, 3, 6, "https://pwr.edu.pl", "2027-05-01"),
      program("Gdansk University of Technology", "Gdansk", "Mid-tier", 5, "MSc Informatics", 3100, 2.9, 6, "https://pg.edu.pl", "2027-05-15"),
      program("Poznan University of Technology", "Poznan", "Mid-tier", 5, "MSc Artificial Intelligence", 3300, 2.9, 6, "https://put.poznan.pl", "2027-05-30", undefined, true),
      program("Lodz University of Technology", "Lodz", "Accessible-tier", 4, "MSc Computer Science", 2800, 2.8, 6, "https://p.lodz.pl", "2027-06-15"),
      program("University of Silesia", "Katowice", "Accessible-tier", 4, "MSc Software Engineering", 2600, 2.8, 6, "https://us.edu.pl", "2027-06-30"),
      program("Kozminski University", "Warsaw", "Accessible-tier", 5, "Master in Big Data Science", 5200, 3, 6.5, "https://www.kozminski.edu.pl", "2027-07-15", undefined, false, true)
    ]
  },
  {
    name: "France",
    averageLivingCostUsd: 850,
    postStudyWorkVisaMonths: 24,
    partTimeWorkHours: 20,
    visaDifficulty: "Medium",
    languageRequirement: "English programs available; French useful for internships",
    safetyScore: 8.1,
    notes: "Strong research destination with many public universities and scholarship routes for international students.",
    universities: [
      program("Sorbonne University", "Paris", "Top-tier", 8, "Master in Computer Science", 6000, 3.4, 6.5, "https://www.sorbonne-universite.fr", "2027-02-15", 310, true),
      program("Universite Paris-Saclay", "Paris", "Top-tier", 8, "MSc Artificial Intelligence", 5500, 3.4, 6.5, "https://www.universite-paris-saclay.fr", "2027-03-01", 310, true),
      program("Institut Polytechnique de Paris", "Palaiseau", "Top-tier", 8, "MSc Data and Artificial Intelligence", 9000, 3.5, 7, "https://www.ip-paris.fr", "2027-03-15", 315, true),
      program("Ecole Polytechnique", "Palaiseau", "Top-tier", 9, "MSc Data Science for Business", 12000, 3.6, 7, "https://www.polytechnique.edu", "2027-02-01", 315, true, true),
      program("University of Grenoble Alpes", "Grenoble", "Mid-tier", 6, "MSc Informatics", 4200, 3.1, 6.5, "https://www.univ-grenoble-alpes.fr", "2027-04-01", undefined, true),
      program("University of Bordeaux", "Bordeaux", "Mid-tier", 5, "MSc Software Engineering", 3600, 3, 6, "https://www.u-bordeaux.com", "2027-04-20"),
      program("University of Strasbourg", "Strasbourg", "Mid-tier", 5, "MSc Computer Science", 3400, 3, 6, "https://en.unistra.fr", "2027-05-01"),
      program("INSA Lyon", "Lyon", "Mid-tier", 6, "MSc Cybersecurity", 5200, 3.1, 6.5, "https://www.insa-lyon.fr", "2027-05-15"),
      program("University of Lille", "Lille", "Accessible-tier", 4, "MSc Data Science", 3100, 2.9, 6, "https://www.univ-lille.fr", "2027-06-01"),
      program("Toulouse INP", "Toulouse", "Accessible-tier", 5, "MSc Computer Science for Aerospace", 4800, 3, 6.5, "https://www.toulouse-inp.fr", "2027-06-20")
    ]
  },
  {
    name: "Netherlands",
    averageLivingCostUsd: 1250,
    postStudyWorkVisaMonths: 12,
    partTimeWorkHours: 16,
    visaDifficulty: "Low",
    languageRequirement: "English",
    safetyScore: 8.6,
    notes: "English-friendly destination with strong applied technology universities and a mature startup ecosystem.",
    universities: [
      program("Delft University of Technology", "Delft", "Top-tier", 9, "MSc Computer Science", 18000, 3.5, 7, "https://www.tudelft.nl", "2027-01-15", 315, true),
      program("University of Amsterdam", "Amsterdam", "Top-tier", 8, "MSc Artificial Intelligence", 17000, 3.4, 7, "https://www.uva.nl", "2027-02-01", 310, true),
      program("Eindhoven University of Technology", "Eindhoven", "Top-tier", 8, "MSc Data Science and AI", 16500, 3.4, 6.5, "https://www.tue.nl", "2027-02-15", 310, true),
      program("University of Twente", "Enschede", "Mid-tier", 6, "MSc Computer Science", 15000, 3.1, 6.5, "https://www.utwente.nl", "2027-03-01"),
      program("Utrecht University", "Utrecht", "Top-tier", 7, "MSc Computing Science", 16000, 3.3, 6.5, "https://www.uu.nl", "2027-03-15", 305, true),
      program("Leiden University", "Leiden", "Mid-tier", 6, "MSc ICT in Business", 14500, 3, 6.5, "https://www.universiteitleiden.nl", "2027-04-01", undefined, false, true),
      program("Vrije Universiteit Amsterdam", "Amsterdam", "Mid-tier", 6, "MSc Computer Science", 15500, 3.1, 6.5, "https://vu.nl", "2027-04-15"),
      program("Radboud University", "Nijmegen", "Mid-tier", 5, "MSc Data Science", 14000, 3, 6.5, "https://www.ru.nl", "2027-05-01"),
      program("Tilburg University", "Tilburg", "Accessible-tier", 4, "MSc Data Science and Society", 13000, 2.9, 6.5, "https://www.tilburguniversity.edu", "2027-05-15"),
      program("Maastricht University", "Maastricht", "Accessible-tier", 5, "MSc Artificial Intelligence", 14200, 3, 6.5, "https://www.maastrichtuniversity.nl", "2027-06-01")
    ]
  },
  {
    name: "Sweden",
    averageLivingCostUsd: 1150,
    postStudyWorkVisaMonths: 12,
    partTimeWorkHours: 20,
    visaDifficulty: "Low",
    languageRequirement: "English",
    safetyScore: 8.7,
    notes: "Innovation-focused study destination with strong English-taught master's programs and a collaborative academic culture.",
    universities: [
      program("KTH Royal Institute of Technology", "Stockholm", "Top-tier", 8, "MSc Computer Science", 17000, 3.4, 6.5, "https://www.kth.se", "2027-01-15", 310, true),
      program("Lund University", "Lund", "Top-tier", 7, "MSc Machine Learning, Systems and Control", 15500, 3.3, 6.5, "https://www.lunduniversity.lu.se", "2027-01-17", 305, true),
      program("Uppsala University", "Uppsala", "Top-tier", 7, "MSc Computer Science", 14500, 3.2, 6.5, "https://www.uu.se", "2027-01-20", 305),
      program("Chalmers University of Technology", "Gothenburg", "Top-tier", 8, "MSc Data Science and AI", 16500, 3.4, 6.5, "https://www.chalmers.se", "2027-01-25", 310, true),
      program("Stockholm University", "Stockholm", "Mid-tier", 6, "MSc Data Science, Statistics and Decision Analysis", 13500, 3.1, 6.5, "https://www.su.se", "2027-02-01", undefined, true),
      program("Linkoping University", "Linkoping", "Mid-tier", 6, "MSc Computer Science", 13000, 3, 6.5, "https://liu.se", "2027-02-10"),
      program("University of Gothenburg", "Gothenburg", "Mid-tier", 5, "MSc Software Engineering and Management", 12500, 3, 6.5, "https://www.gu.se", "2027-02-15", undefined, false, true),
      program("Umea University", "Umea", "Accessible-tier", 4, "MSc Computing Science", 11000, 2.9, 6, "https://www.umu.se", "2027-03-01"),
      program("Orebro University", "Orebro", "Accessible-tier", 4, "MSc Computer Science", 10500, 2.8, 6, "https://www.oru.se", "2027-03-15"),
      program("Jonkoping University", "Jonkoping", "Accessible-tier", 4, "MSc AI Engineering", 12000, 2.9, 6.5, "https://ju.se", "2027-04-01", undefined, false, true)
    ]
  },
  {
    name: "Ireland",
    averageLivingCostUsd: 1350,
    postStudyWorkVisaMonths: 24,
    partTimeWorkHours: 20,
    visaDifficulty: "Medium",
    languageRequirement: "English",
    safetyScore: 8.3,
    notes: "English-speaking European tech hub with strong software, data, and cybersecurity programs.",
    universities: [
      program("Trinity College Dublin", "Dublin", "Top-tier", 8, "MSc Computer Science", 23000, 3.4, 6.5, "https://www.tcd.ie", "2027-03-31", 310, true),
      program("University College Dublin", "Dublin", "Top-tier", 8, "MSc Computer Science Negotiated Learning", 22500, 3.3, 6.5, "https://www.ucd.ie", "2027-04-15", 305),
      program("University of Galway", "Galway", "Mid-tier", 6, "MSc Computer Science Data Analytics", 18000, 3.1, 6.5, "https://www.universityofgalway.ie", "2027-05-01", undefined, true),
      program("University College Cork", "Cork", "Mid-tier", 6, "MSc Data Science and Analytics", 18500, 3.1, 6.5, "https://www.ucc.ie", "2027-05-15", 300, true),
      program("Dublin City University", "Dublin", "Mid-tier", 6, "MSc Computing", 17500, 3, 6.5, "https://www.dcu.ie", "2027-06-01"),
      program("Maynooth University", "Maynooth", "Mid-tier", 5, "MSc Software Engineering", 16500, 3, 6.5, "https://www.maynoothuniversity.ie", "2027-06-15"),
      program("Technological University Dublin", "Dublin", "Accessible-tier", 5, "MSc Computer Science", 15000, 2.9, 6, "https://www.tudublin.ie", "2027-06-30"),
      program("University of Limerick", "Limerick", "Mid-tier", 5, "MSc Artificial Intelligence and Machine Learning", 17000, 3, 6.5, "https://www.ul.ie", "2027-07-01", undefined, true),
      program("National College of Ireland", "Dublin", "Accessible-tier", 4, "MSc Cloud Computing", 14500, 2.8, 6, "https://www.ncirl.ie", "2027-07-15", undefined, false, true),
      program("Griffith College", "Dublin", "Accessible-tier", 4, "MSc Big Data Management", 13200, 2.8, 6, "https://www.griffith.ie", "2027-08-01")
    ]
  },
  {
    name: "United Kingdom",
    averageLivingCostUsd: 1450,
    postStudyWorkVisaMonths: 24,
    partTimeWorkHours: 20,
    visaDifficulty: "Medium",
    languageRequirement: "English",
    safetyScore: 8.1,
    notes: "Shorter degree duration and strong graduate route, with higher tuition in many cities.",
    universities: [
      program("University of Oxford", "Oxford", "Top-tier", 10, "MSc Advanced Computer Science", 48500, 3.8, 7.5, "https://www.ox.ac.uk", "2027-01-06", 325, true),
      program("University of Cambridge", "Cambridge", "Top-tier", 10, "MPhil Advanced Computer Science", 47500, 3.8, 7.5, "https://www.cam.ac.uk", "2027-01-10", 325, true),
      program("Imperial College London", "London", "Top-tier", 9, "MSc Computing", 43000, 3.7, 7, "https://www.imperial.ac.uk", "2027-02-01", 320, true, true),
      program("University College London", "London", "Top-tier", 9, "MSc Computer Science", 40500, 3.6, 7, "https://www.ucl.ac.uk", "2027-02-15", 315),
      program("University of Edinburgh", "Edinburgh", "Top-tier", 8, "MSc Artificial Intelligence", 38500, 3.5, 7, "https://www.ed.ac.uk", "2027-03-01", 315, true),
      program("University of Manchester", "Manchester", "Mid-tier", 7, "MSc Advanced Computer Science", 33000, 3.3, 6.5, "https://www.manchester.ac.uk", "2027-03-31", 305),
      program("University of Glasgow", "Glasgow", "Mid-tier", 6, "MSc Data Science", 30500, 3.2, 6.5, "https://www.gla.ac.uk", "2027-04-15"),
      program("University of Birmingham", "Birmingham", "Mid-tier", 6, "MSc Computer Science", 29000, 3.1, 6.5, "https://www.birmingham.ac.uk", "2027-05-01"),
      program("University of Kent", "Canterbury", "Accessible-tier", 4, "MSc Cyber Security", 25500, 3, 6.5, "https://www.kent.ac.uk", "2027-07-31"),
      program("Coventry University", "Coventry", "Accessible-tier", 4, "MSc Software Development", 21000, 2.8, 6, "https://www.coventry.ac.uk", "2027-08-15", undefined, false, true)
    ]
  },
  {
    name: "United States",
    averageLivingCostUsd: 1700,
    postStudyWorkVisaMonths: 36,
    partTimeWorkHours: 20,
    visaDifficulty: "High",
    languageRequirement: "English",
    safetyScore: 7.8,
    notes: "Large program variety and strong OPT pathway for STEM fields, but cost and admissions vary widely.",
    universities: [
      program("Massachusetts Institute of Technology", "Cambridge", "Top-tier", 10, "MS Electrical Engineering and Computer Science", 59000, 3.85, 7.5, "https://www.mit.edu", "2026-12-15", 328, true),
      program("Stanford University", "Stanford", "Top-tier", 10, "MS Computer Science", 61000, 3.85, 7.5, "https://www.stanford.edu", "2026-12-05", 328, true),
      program("Carnegie Mellon University", "Pittsburgh", "Top-tier", 10, "MS Computer Science", 58000, 3.8, 7.5, "https://www.cmu.edu", "2026-12-10", 325, true, true),
      program("University of Illinois Urbana-Champaign", "Urbana", "Top-tier", 8, "MS Computer Science", 42000, 3.5, 7, "https://illinois.edu", "2027-01-15", 318, true),
      program("Georgia Institute of Technology", "Atlanta", "Top-tier", 8, "MS Computer Science", 36000, 3.4, 7, "https://www.gatech.edu", "2027-02-01", 315),
      program("Purdue University", "West Lafayette", "Mid-tier", 7, "MS Computer Science", 31000, 3.3, 6.5, "https://www.purdue.edu", "2027-02-15", 310),
      program("Arizona State University", "Tempe", "Mid-tier", 6, "MS Computer Science", 28000, 3, 6.5, "https://www.asu.edu", "2027-04-01", 300, false, true),
      program("University of Texas at Dallas", "Richardson", "Accessible-tier", 5, "MS Computer Science", 26000, 3, 6.5, "https://www.utdallas.edu", "2027-05-01", 295),
      program("Northeastern University", "Boston", "Mid-tier", 6, "MS Software Engineering Systems", 35000, 3.1, 7, "https://www.northeastern.edu", "2027-04-15", undefined, false, true),
      program("San Jose State University", "San Jose", "Accessible-tier", 5, "MS Software Engineering", 24000, 2.9, 6.5, "https://www.sjsu.edu", "2027-05-30", undefined, false, true)
    ]
  }
];

const scholarshipCatalog: StarterScholarship[] = [
  scholarship("Vanier Canada Graduate Scholarship", "Canada", ["Any", "Bangladeshi"], ["Computer Science", "Engineering", "Data Science"], 3.6, 7, true, 50000, "Major funding", "2027-01-10", "https://vanier.gc.ca"),
  scholarship("Ontario Graduate Scholarship", "Canada", ["Any", "Bangladeshi"], ["Computer Science", "Engineering"], 3.4, 6.5, true, 11000, "Partial", "2027-02-01", "https://www.sgs.utoronto.ca/awards/ontario-graduate-scholarship/"),
  scholarship("UBC International Tuition Award", "Canada", ["Any"], ["Computer Science", "Data Science", "Engineering"], 3.2, 6.5, false, 3200, "Partial", "2027-03-15", "https://www.grad.ubc.ca/awards"),
  scholarship("Waterloo Graduate Scholarship", "Canada", ["Any", "Bangladeshi"], ["Computer Science", "Data Science"], 3.3, 7, false, 5000, "Partial", "2027-04-01", "https://uwaterloo.ca/graduate-studies-postdoctoral-affairs/awards"),
  scholarship("Alberta Graduate Excellence Scholarship", "Canada", ["Any"], ["Computer Science", "Engineering"], 3.2, 6.5, false, 12000, "Partial", "2027-04-30", "https://www.ualberta.ca"),
  scholarship("Concordia International Tuition Award", "Canada", ["Any"], ["Computer Science", "Software Engineering"], 3, 6.5, false, 7000, "Partial", "2027-05-15", "https://www.concordia.ca"),
  scholarship("Dalhousie Faculty of Computer Science Award", "Canada", ["Any", "Bangladeshi"], ["Computer Science", "Data Analytics"], 3, 6.5, false, 6000, "Partial", "2027-05-30", "https://www.dal.ca"),
  scholarship("Calgary Graduate Award Competition", "Canada", ["Any"], ["Computer Science", "Engineering", "STEM"], 3.2, 6.5, true, 18000, "Major funding", "2027-02-20", "https://grad.ucalgary.ca"),
  scholarship("McGill Graduate Excellence Fellowship", "Canada", ["Any"], ["Computer Science", "Artificial Intelligence"], 3.5, 7, true, 15000, "Partial", "2027-01-25", "https://www.mcgill.ca"),
  scholarship("Memorial School of Graduate Studies Fellowship", "Canada", ["Any", "Bangladeshi"], ["Computer Science", "STEM"], 2.8, 6, false, 9000, "Partial", "2027-06-10", "https://www.mun.ca/sgs"),

  scholarship("Australia Awards Scholarship", "Australia", ["Bangladeshi", "Any"], ["Computer Science", "Engineering", "Public Policy"], 3.2, 6.5, false, 30000, "Full or major partial", "2027-04-30", "https://www.dfat.gov.au/people-to-people/australia-awards"),
  scholarship("Melbourne Graduate Research Scholarship", "Australia", ["Any"], ["Computer Science", "Data Science"], 3.5, 7, true, 36000, "Full or major partial", "2027-01-31", "https://scholarships.unimelb.edu.au"),
  scholarship("UNSW International Scholarship", "Australia", ["Any", "Bangladeshi"], ["Computer Science", "Engineering"], 3.1, 6.5, false, 10000, "Partial", "2027-03-31", "https://www.unsw.edu.au/study/international-students/scholarships"),
  scholarship("Monash International Leadership Scholarship", "Australia", ["Any"], ["Computer Science", "Business", "Engineering"], 3.3, 6.5, false, 15000, "Partial", "2027-04-15", "https://www.monash.edu/study/fees-scholarships/scholarships"),
  scholarship("Deakin International Scholarship", "Australia", ["Any", "Bangladeshi"], ["Computer Science", "Data Science"], 2.8, 6, false, 8000, "Partial", "2027-06-01", "https://www.deakin.edu.au/study/fees-and-scholarships/scholarships"),
  scholarship("ANU Chancellor's International Scholarship", "Australia", ["Any"], ["Computer Science", "STEM"], 3.3, 6.5, false, 16000, "Partial", "2027-02-28", "https://www.anu.edu.au/study/scholarships"),
  scholarship("Sydney International Student Award", "Australia", ["Bangladeshi", "Any"], ["Computer Science", "Data Science", "Engineering"], 3, 6.5, false, 12000, "Partial", "2027-03-10", "https://www.sydney.edu.au/scholarships"),
  scholarship("University of Queensland International Excellence Scholarship", "Australia", ["Any"], ["Computer Science", "Cyber Security", "Engineering"], 3.2, 6.5, false, 10000, "Partial", "2027-04-20", "https://scholarships.uq.edu.au"),
  scholarship("RMIT Future Leaders Scholarship", "Australia", ["Bangladeshi", "Any"], ["Computer Science", "Information Technology"], 2.8, 6.5, false, 9000, "Partial", "2027-05-20", "https://www.rmit.edu.au/study-with-us/international-students/scholarships"),
  scholarship("Swinburne International Excellence Postgraduate Scholarship", "Australia", ["Any"], ["Computer Science", "Software Engineering"], 2.8, 6, false, 11000, "Partial", "2027-06-20", "https://www.swinburne.edu.au/study/options/scholarships"),

  scholarship("Master Mind Scholarship", "Belgium", ["Any", "Bangladeshi"], ["Computer Science", "Engineering", "Data Science"], 3.3, 6.5, false, 10000, "Partial", "2027-03-01", "https://www.studyinflanders.be/scholarships/master-mind-scholarships"),
  scholarship("KU Leuven Science Scholarship", "Belgium", ["Any"], ["Computer Science", "Artificial Intelligence", "Data Science"], 3.5, 7, true, 12000, "Partial", "2027-02-15", "https://www.kuleuven.be"),
  scholarship("Ghent University Top-up Grant", "Belgium", ["Bangladeshi", "Any"], ["Computer Science", "Engineering"], 3.2, 6.5, true, 9000, "Partial", "2027-03-20", "https://www.ugent.be"),
  scholarship("VUB International Scholarship", "Belgium", ["Any"], ["Computer Science", "Business"], 3, 6.5, false, 5000, "Partial", "2027-04-30", "https://www.vub.be"),
  scholarship("ARES Scholarship Belgium", "Belgium", ["Bangladeshi", "Any"], ["Computer Science", "Development", "Engineering"], 3.1, 6, false, 14000, "Full or major partial", "2027-01-25", "https://www.ares-ac.be"),
  scholarship("VLIR-UOS ICP Connect Scholarship", "Belgium", ["Bangladeshi", "Developing Countries"], ["Computer Science", "STEM", "Development"], 3, 6.5, false, 17000, "Full or major partial", "2027-02-05", "https://www.vliruos.be"),
  scholarship("University of Antwerp Global Minds Grant", "Belgium", ["Bangladeshi", "Developing Countries"], ["Computer Science", "Data Science"], 3, 6.5, false, 8000, "Partial", "2027-04-10", "https://www.uantwerpen.be"),
  scholarship("UCLouvain International Master's Scholarship", "Belgium", ["Any"], ["Computer Science", "Artificial Intelligence", "STEM"], 3.2, 6.5, true, 7000, "Partial", "2027-04-25", "https://uclouvain.be"),
  scholarship("Hasselt University Master Scholarship", "Belgium", ["Any", "Bangladeshi"], ["Statistics", "Data Science", "Computer Science"], 3, 6, false, 6000, "Partial", "2027-05-05", "https://www.uhasselt.be"),
  scholarship("University of Liege International Grant", "Belgium", ["Any"], ["Computer Science", "Engineering"], 2.9, 6, false, 5000, "Partial", "2027-05-25", "https://www.uliege.be"),

  scholarship("DAAD Graduate Scholarship", "Germany", ["Bangladeshi", "Any"], ["Computer Science", "Engineering", "Mathematics"], 3.2, 6.5, false, 12000, "Full or major partial", "2027-04-30", "https://www.daad.de"),
  scholarship("Deutschlandstipendium", "Germany", ["Any"], ["Computer Science", "Engineering", "Business"], 3, 6, false, 3600, "Partial", "2027-05-30", "https://www.deutschlandstipendium.de"),
  scholarship("TUM Asia and International Talent Scholarship", "Germany", ["Any", "Bangladeshi"], ["Computer Science", "Data Science"], 3.4, 6.5, true, 8000, "Partial", "2027-03-15", "https://www.tum.de"),
  scholarship("RWTH International Academy Scholarship", "Germany", ["Any"], ["Computer Science", "Engineering"], 3.2, 6.5, false, 6000, "Partial", "2027-04-15", "https://www.rwth-aachen.de"),
  scholarship("Saarland Graduate Scholarship", "Germany", ["Any", "Bangladeshi"], ["Computer Science", "Artificial Intelligence"], 3, 6.5, true, 5000, "Partial", "2027-05-15", "https://www.uni-saarland.de"),
  scholarship("University of Bonn International Fellowship", "Germany", ["Any"], ["Computer Science", "Autonomous Systems", "STEM"], 3.2, 6.5, true, 7000, "Partial", "2027-04-05", "https://www.uni-bonn.de"),
  scholarship("TU Darmstadt Deutschland Scholarship", "Germany", ["Any", "Bangladeshi"], ["Computer Science", "Software Engineering"], 3, 6.5, false, 3600, "Partial", "2027-05-05", "https://www.tu-darmstadt.de"),
  scholarship("FAU International Graduate Scholarship", "Germany", ["Any"], ["Artificial Intelligence", "Computer Science", "Data Science"], 3, 6.5, true, 5500, "Partial", "2027-06-05", "https://www.fau.eu"),
  scholarship("University of Passau International Support Scholarship", "Germany", ["Any", "Bangladeshi"], ["Computer Science", "STEM"], 2.8, 6, false, 4000, "Partial", "2027-06-25", "https://www.uni-passau.de"),
  scholarship("SRH Berlin Performance Scholarship", "Germany", ["Any"], ["Computer Science", "Business Informatics"], 2.8, 6.5, false, 5000, "Partial", "2027-07-20", "https://www.srh-berlin.de"),

  scholarship("Poland Government Scholarship", "Poland", ["Bangladeshi", "Any"], ["Computer Science", "Engineering", "STEM"], 3, 6, false, 9000, "Partial", "2027-02-28", "https://www.gov.pl"),
  scholarship("NAWA Banach Scholarship", "Poland", ["Bangladeshi", "Developing Countries"], ["Computer Science", "Engineering", "Data Science"], 3.1, 6.5, false, 12000, "Full or major partial", "2027-03-31", "https://nawa.gov.pl"),
  scholarship("University of Warsaw International Award", "Poland", ["Any"], ["Computer Science", "Data Science"], 3.2, 6.5, true, 5000, "Partial", "2027-04-10", "https://en.uw.edu.pl"),
  scholarship("Warsaw University of Technology Excellence Scholarship", "Poland", ["Any", "Bangladeshi"], ["Computer Science", "Engineering"], 3, 6, false, 4500, "Partial", "2027-04-25", "https://www.pw.edu.pl"),
  scholarship("AGH International Student Grant", "Poland", ["Any"], ["Data Science", "Artificial Intelligence", "Computer Science"], 2.9, 6, false, 3800, "Partial", "2027-05-20", "https://www.agh.edu.pl"),
  scholarship("Wroclaw Tech Merit Scholarship", "Poland", ["Bangladeshi", "Any"], ["Computer Engineering", "Computer Science"], 2.8, 6, false, 3500, "Partial", "2027-06-10", "https://pwr.edu.pl"),

  scholarship("Eiffel Excellence Scholarship", "France", ["Bangladeshi", "Any"], ["Computer Science", "Engineering", "STEM"], 3.4, 6.5, false, 15000, "Full or major partial", "2027-01-10", "https://www.campusfrance.org"),
  scholarship("France Excellence Europa Scholarship", "France", ["Any"], ["Computer Science", "Data Science", "Engineering"], 3.2, 6.5, false, 10000, "Partial", "2027-02-20", "https://www.campusfrance.org"),
  scholarship("Paris-Saclay International Master's Scholarship", "France", ["Any", "Bangladeshi"], ["Artificial Intelligence", "Computer Science", "Data Science"], 3.3, 6.5, true, 11000, "Partial", "2027-03-15", "https://www.universite-paris-saclay.fr"),
  scholarship("Ecole Polytechnique Graduate Scholarship", "France", ["Any"], ["Data Science", "Computer Science", "Engineering"], 3.5, 7, true, 14000, "Partial", "2027-02-15", "https://www.polytechnique.edu"),
  scholarship("Grenoble Alpes Idex Scholarship", "France", ["Bangladeshi", "Any"], ["Computer Science", "Informatics", "STEM"], 3, 6.5, false, 8000, "Partial", "2027-04-30", "https://www.univ-grenoble-alpes.fr"),
  scholarship("INSA Lyon International Excellence Grant", "France", ["Any"], ["Cybersecurity", "Computer Science", "Engineering"], 3.1, 6.5, false, 7000, "Partial", "2027-05-15", "https://www.insa-lyon.fr"),

  scholarship("Holland Scholarship", "Netherlands", ["Any", "Bangladeshi"], ["Computer Science", "Engineering", "Data Science"], 3.2, 6.5, false, 6500, "Partial", "2027-02-01", "https://www.studyinnl.org"),
  scholarship("TU Delft Excellence Scholarship", "Netherlands", ["Any"], ["Computer Science", "Engineering", "AI"], 3.6, 7, true, 18000, "Full or major partial", "2027-01-15", "https://www.tudelft.nl"),
  scholarship("University of Amsterdam Merit Scholarship", "Netherlands", ["Bangladeshi", "Any"], ["Artificial Intelligence", "Computer Science"], 3.4, 7, true, 12000, "Partial", "2027-02-15", "https://www.uva.nl"),
  scholarship("Eindhoven Technology Scholarship", "Netherlands", ["Any"], ["Data Science", "AI", "Computer Science"], 3.3, 6.5, false, 10000, "Partial", "2027-03-01", "https://www.tue.nl"),
  scholarship("Utrecht Excellence Scholarship", "Netherlands", ["Any", "Bangladeshi"], ["Computer Science", "Data Science"], 3.4, 6.5, true, 11000, "Partial", "2027-03-20", "https://www.uu.nl"),
  scholarship("Twente Kipaji Scholarship", "Netherlands", ["Bangladeshi", "Developing Countries"], ["Computer Science", "Engineering", "STEM"], 3.1, 6.5, false, 9000, "Partial", "2027-04-15", "https://www.utwente.nl"),

  scholarship("Swedish Institute Scholarship", "Sweden", ["Bangladeshi", "Developing Countries"], ["Computer Science", "Engineering", "STEM"], 3.3, 6.5, false, 16000, "Full or major partial", "2027-01-15", "https://si.se"),
  scholarship("KTH Scholarship", "Sweden", ["Any"], ["Computer Science", "Data Science", "Engineering"], 3.4, 6.5, true, 15000, "Full or major partial", "2027-01-10", "https://www.kth.se"),
  scholarship("Lund University Global Scholarship", "Sweden", ["Any", "Bangladeshi"], ["Computer Science", "Machine Learning", "STEM"], 3.2, 6.5, false, 10000, "Partial", "2027-01-20", "https://www.lunduniversity.lu.se"),
  scholarship("Chalmers IPOET Scholarship", "Sweden", ["Any"], ["Data Science", "AI", "Computer Science"], 3.3, 6.5, true, 12000, "Partial", "2027-01-25", "https://www.chalmers.se"),
  scholarship("Uppsala Global Scholarship", "Sweden", ["Bangladeshi", "Any"], ["Computer Science", "Engineering"], 3.1, 6.5, false, 9000, "Partial", "2027-02-01", "https://www.uu.se"),
  scholarship("Linkoping International Scholarship", "Sweden", ["Any"], ["Computer Science", "Software Engineering"], 3, 6, false, 7500, "Partial", "2027-02-20", "https://liu.se"),

  scholarship("Government of Ireland International Education Scholarship", "Ireland", ["Any", "Bangladeshi"], ["Computer Science", "Engineering", "Data Science"], 3.3, 6.5, false, 12000, "Partial", "2027-03-15", "https://hea.ie"),
  scholarship("Trinity Global Excellence Postgraduate Scholarship", "Ireland", ["Any"], ["Computer Science", "Data Science", "STEM"], 3.4, 6.5, true, 7000, "Partial", "2027-04-01", "https://www.tcd.ie"),
  scholarship("UCD Global Graduate Scholarship", "Ireland", ["Bangladeshi", "Any"], ["Computer Science", "Software Engineering"], 3.1, 6.5, false, 6000, "Partial", "2027-04-15", "https://www.ucd.ie"),
  scholarship("University of Galway International Merit Scholarship", "Ireland", ["Any"], ["Data Analytics", "Computer Science", "AI"], 3, 6.5, false, 5500, "Partial", "2027-05-01", "https://www.universityofgalway.ie"),
  scholarship("Dublin City University International Scholarship", "Ireland", ["Any", "Bangladeshi"], ["Computing", "Computer Science", "Cybersecurity"], 2.9, 6, false, 5000, "Partial", "2027-05-20", "https://www.dcu.ie"),
  scholarship("University of Limerick Faculty Scholarship", "Ireland", ["Any"], ["Artificial Intelligence", "Machine Learning", "Computer Science"], 3, 6.5, true, 6500, "Partial", "2027-06-10", "https://www.ul.ie"),

  scholarship("Chevening Scholarship", "United Kingdom", ["Bangladeshi"], ["Computer Science", "Business", "Engineering"], 3.2, 6.5, false, 35000, "Full", "2026-11-05", "https://www.chevening.org"),
  scholarship("GREAT Scholarship", "United Kingdom", ["Bangladeshi", "Any"], ["Computer Science", "Data Science", "Engineering"], 3.1, 6.5, false, 10000, "Partial", "2027-04-30", "https://study-uk.britishcouncil.org/scholarships-funding/great-scholarships"),
  scholarship("Commonwealth Masters Scholarship", "United Kingdom", ["Bangladeshi"], ["Computer Science", "Development", "Engineering"], 3.3, 6.5, false, 30000, "Full", "2026-12-15", "https://cscuk.fcdo.gov.uk"),
  scholarship("University of Edinburgh Global Scholarship", "United Kingdom", ["Any"], ["Computer Science", "Artificial Intelligence"], 3.4, 7, true, 12000, "Partial", "2027-03-31", "https://www.ed.ac.uk/student-funding"),
  scholarship("Kent Future Student Scholarship", "United Kingdom", ["Bangladeshi", "Any"], ["Computer Science", "Cyber Security"], 3, 6.5, false, 5000, "Partial", "2027-06-15", "https://www.kent.ac.uk/scholarships"),
  scholarship("Imperial Excellence Scholarship", "United Kingdom", ["Any"], ["Computer Science", "Artificial Intelligence", "STEM"], 3.6, 7, true, 18000, "Partial", "2027-02-05", "https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search"),
  scholarship("UCL Global Masters Scholarship", "United Kingdom", ["Bangladeshi", "Any"], ["Computer Science", "Data Science"], 3.3, 6.5, false, 19000, "Partial", "2027-04-20", "https://www.ucl.ac.uk/scholarships"),
  scholarship("Manchester Global Futures Scholarship", "United Kingdom", ["Bangladeshi", "Any"], ["Computer Science", "Engineering"], 3, 6.5, false, 10000, "Partial", "2027-05-10", "https://www.manchester.ac.uk/study/international/finance-and-scholarships/funding"),
  scholarship("Glasgow International Leadership Scholarship", "United Kingdom", ["Any"], ["Computer Science", "Data Science", "STEM"], 3.1, 6.5, false, 12000, "Partial", "2027-05-25", "https://www.gla.ac.uk/scholarships"),
  scholarship("Birmingham Global Masters Scholarship", "United Kingdom", ["Bangladeshi", "Any"], ["Computer Science", "Software Engineering"], 3, 6.5, false, 6500, "Partial", "2027-06-05", "https://www.birmingham.ac.uk/scholarships"),

  scholarship("Fulbright Foreign Student Program", "United States", ["Bangladeshi"], ["Computer Science", "Engineering", "Data Science"], 3.5, 7, true, 45000, "Full", "2026-10-15", "https://foreign.fulbrightonline.org"),
  scholarship("Knight-Hennessy Scholars", "United States", ["Any"], ["Computer Science", "Business", "Engineering"], 3.7, 7.5, true, 55000, "Full", "2026-10-09", "https://knight-hennessy.stanford.edu"),
  scholarship("AAUW International Fellowship", "United States", ["Any", "Bangladeshi"], ["Computer Science", "Data Science"], 3.2, 6.5, false, 20000, "Partial", "2026-11-15", "https://www.aauw.org/resources/programs/fellowships-grants"),
  scholarship("Illinois Graduate College Fellowship", "United States", ["Any"], ["Computer Science", "Engineering"], 3.4, 7, true, 18000, "Partial", "2027-02-01", "https://grad.illinois.edu/fellowship"),
  scholarship("ASU New American University Graduate Award", "United States", ["Any", "Bangladeshi"], ["Computer Science", "Software Engineering"], 3, 6.5, false, 8000, "Partial", "2027-04-15", "https://scholarships.asu.edu"),
  scholarship("Stanford Knight-Hennessy Program Grant", "United States", ["Any"], ["Computer Science", "STEM", "Business"], 3.7, 7.5, true, 50000, "Full", "2026-10-20", "https://knight-hennessy.stanford.edu"),
  scholarship("MIT Graduate Fellowship", "United States", ["Any"], ["Computer Science", "Engineering", "STEM"], 3.8, 7.5, true, 52000, "Full", "2026-12-01", "https://oge.mit.edu"),
  scholarship("Georgia Tech Graduate Fellowship", "United States", ["Any", "Bangladeshi"], ["Computer Science", "Data Science"], 3.3, 7, false, 16000, "Partial", "2027-02-25", "https://grad.gatech.edu"),
  scholarship("Purdue Graduate School Fellowship", "United States", ["Any"], ["Computer Science", "Software Engineering"], 3.2, 6.5, false, 14000, "Partial", "2027-03-15", "https://www.purdue.edu/gradschool"),
  scholarship("Northeastern Global Achievement Award", "United States", ["Any", "Bangladeshi"], ["Computer Science", "Cyber Security", "Software Engineering"], 3, 6.5, false, 10000, "Partial", "2027-04-25", "https://graduate.northeastern.edu")
];

async function main() {
  const [studentPassword, managerPassword, adminPassword] = await Promise.all([
    bcrypt.hash("Student@123", 12),
    bcrypt.hash("Manager@123", 12),
    bcrypt.hash("Admin@123", 12)
  ]);

  const demoStudentProfile = {
    nationality: "Bangladeshi",
    currentDegree: "Bachelor's Degree",
    bachelorDegreeName: "BSc in Computer Science",
    universityName: "BRAC University",
    departmentMajor: "Computer Science & Engineering",
    graduationYear: 2026,
    targetDegree: "Master's Degree",
    fieldOfStudy: "Computer Science",
    cgpa: 3.2,
    cgpaScale: 4,
    ieltsScore: 6.5,
    toeflScore: 90,
    greScore: 310,
    duolingoScore: 120,
    researchPapers: 1,
    workExperienceMonths: 18,
    preferredCountries: ["Australia", "Belgium", "United Kingdom", "United States"],
    preferredIntake: "Fall 2027 (Sept 2027)",
    researchInterest: "Artificial Intelligence, Machine Learning",
    hasWorkExperience: true,
    recentJobTitle: "Software Developer",
    industryField: "IT / Software",
    budgetUsd: 30000,
    preferredTuitionMinUsd: 3000,
    preferredTuitionMaxUsd: 30000,
    needsScholarship: true,
    careerGoal: "Software Engineer"
  };

  const demoStudent = await prisma.user.upsert({
    where: {
      email: "student@example.com"
    },
    update: {
      name: "Demo Student",
      passwordHash: studentPassword
    },
    create: {
      name: "Demo Student",
      email: "student@example.com",
      passwordHash: studentPassword,
      role: "STUDENT"
    }
  });

  await prisma.studentProfile.upsert({
    where: {
      userId: demoStudent.id
    },
    update: demoStudentProfile,
    create: {
      userId: demoStudent.id,
      ...demoStudentProfile
    }
  });

  await prisma.user.upsert({
    where: {
      email: "manager@example.com"
    },
    update: {},
    create: {
      name: "Demo Content Manager",
      email: "manager@example.com",
      passwordHash: managerPassword,
      role: "CONTENT_MANAGER"
    }
  });

  await prisma.user.upsert({
    where: {
      email: "admin@example.com"
    },
    update: {},
    create: {
      name: "Demo Admin",
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: "ADMIN"
    }
  });

  if (process.env.SEED_RESET !== "false") {
    await resetCatalog();
  }

  await seedStarterCatalog();
}

function program(
  name: string,
  city: string,
  rankingBand: string,
  acceptanceDifficulty: number,
  title: string,
  tuitionUsd: number,
  minCgpa: number,
  minIelts: number,
  websiteUrl: string,
  deadline: string,
  minGre?: number,
  researchPreferred = false,
  workExperiencePreferred = false
) {
  return {
    name,
    city,
    rankingBand,
    acceptanceDifficulty,
    websiteUrl,
    program: {
      title,
      field: "Computer Science",
      tuitionUsd,
      minCgpa,
      minIelts,
      minGre,
      researchPreferred,
      workExperiencePreferred,
      deadline
    }
  };
}

function scholarship(
  name: string,
  countryName: string,
  eligibleNationalities: string[],
  eligibleFields: string[],
  minCgpa: number,
  minIelts: number,
  researchRequired: boolean,
  amountUsd: number,
  coverageType: string,
  deadline: string,
  sourceUrl: string,
  degreeLevel = "Master's Degree",
  requiredDocuments = defaultScholarshipDocuments()
): StarterScholarship {
  return {
    name,
    countryName,
    degreeLevel,
    eligibleNationalities,
    eligibleFields,
    minCgpa,
    minIelts,
    researchRequired,
    amountUsd,
    coverageType,
    deadline,
    requiredDocuments,
    sourceUrl
  };
}

function defaultScholarshipDocuments() {
  return [
    "Academic transcripts",
    "Statement of purpose",
    "CV or resume",
    "English test score",
    "Recommendation letters"
  ];
}

async function resetCatalog() {
  await prisma.monitorAlert.deleteMany();
  await prisma.requirementSnapshot.deleteMany();
  await prisma.applicationStrategyItem.deleteMany();
  await prisma.applicationStrategyPlan.deleteMany();
  await prisma.scholarshipDeadline.deleteMany();
  await prisma.studentSavedScholarship.deleteMany();
  await prisma.scholarshipMatch.deleteMany();
  await prisma.universityMatch.deleteMany();
  await prisma.scholarshipEligibilityRule.deleteMany();
  await prisma.scholarship.deleteMany();
  await prisma.program.deleteMany();
  await prisma.university.deleteMany();
  await prisma.country.deleteMany();
}

async function seedStarterCatalog() {
  const countryByName = new Map<string, string>();

  for (const countryData of starterCatalog) {
    const countryFields = {
      averageLivingCostUsd: countryData.averageLivingCostUsd,
      postStudyWorkVisaMonths: countryData.postStudyWorkVisaMonths,
      partTimeWorkHours: countryData.partTimeWorkHours,
      visaDifficulty: countryData.visaDifficulty,
      languageRequirement: countryData.languageRequirement,
      safetyScore: countryData.safetyScore,
      notes: countryData.notes
    };
    const country = await prisma.country.upsert({
      where: {
        name: countryData.name
      },
      update: countryFields,
      create: {
        name: countryData.name,
        ...countryFields
      }
    });
    countryByName.set(country.name, country.id);

    for (const universityData of countryData.universities) {
      const universityFields = {
        city: universityData.city,
        rankingBand: universityData.rankingBand,
        acceptanceDifficulty: universityData.acceptanceDifficulty,
        websiteUrl: universityData.websiteUrl
      };
      const university = await prisma.university.upsert({
        where: {
          name_countryId: {
            name: universityData.name,
            countryId: country.id
          }
        },
        update: universityFields,
        create: {
          name: universityData.name,
          countryId: country.id,
          ...universityFields
        }
      });

      const programFields = {
        degreeLevel: "Master's Degree",
        field: universityData.program.field,
        tuitionUsd: universityData.program.tuitionUsd,
        minCgpa: universityData.program.minCgpa,
        minIelts: universityData.program.minIelts,
        minGre: universityData.program.minGre,
        researchPreferred: Boolean(universityData.program.researchPreferred),
        workExperiencePreferred: Boolean(universityData.program.workExperiencePreferred),
        deadline: new Date(universityData.program.deadline)
      };

      await prisma.program.upsert({
        where: {
          universityId_title: {
            universityId: university.id,
            title: universityData.program.title
          }
        },
        update: programFields,
        create: {
          universityId: university.id,
          title: universityData.program.title,
          ...programFields
        }
      });
    }
  }

  for (const scholarshipData of scholarshipCatalog) {
    const countryId = countryByName.get(scholarshipData.countryName);
    const ruleFields = {
      degreeLevel: scholarshipData.degreeLevel,
      eligibleNationalities: scholarshipData.eligibleNationalities,
      eligibleSubjects: scholarshipData.eligibleFields,
      minCgpa: scholarshipData.minCgpa,
      minIelts: scholarshipData.minIelts
    };
    const scholarshipFields = {
      countryId,
      degreeLevel: scholarshipData.degreeLevel,
      eligibleNationalities: scholarshipData.eligibleNationalities,
      eligibleFields: scholarshipData.eligibleFields,
      minCgpa: scholarshipData.minCgpa,
      minIelts: scholarshipData.minIelts,
      researchRequired: scholarshipData.researchRequired,
      amountUsd: scholarshipData.amountUsd,
      coverageType: scholarshipData.coverageType,
      deadline: new Date(scholarshipData.deadline),
      requiredDocuments: scholarshipData.requiredDocuments,
      status: "APPROVED" as const,
      sourceUrl: scholarshipData.sourceUrl
    };

    await prisma.scholarship.upsert({
      where: {
        name: scholarshipData.name
      },
      update: {
        ...scholarshipFields,
        eligibilityRule: {
          upsert: {
            create: ruleFields,
            update: ruleFields
          }
        }
      },
      create: {
        name: scholarshipData.name,
        ...scholarshipFields,
        eligibilityRule: {
          create: ruleFields
        }
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
