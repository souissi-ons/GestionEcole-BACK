// __tests__/unit/user.validation.test.js

const { validateUser, ROLES } = require("../../models/user");

describe("Tests Unitaires : Validation Joi (user.js)", () => {
  // Données de base valides pour un Tuteur (pour simplifier les tests)
  let validTutorData;
  beforeEach(() => {
    // Réinitialiser les données valides avant chaque test
    validTutorData = {
      firstName: "Jean",
      lastName: "Valide",
      email: "jean.valide@app.com",
      //   password: "Password123", // Doit faire au moins 5 caractères
      role: ROLES.TUTOR,
      identifier: "12345678", // 8 chiffres requis pour Tuteur
      phoneNumber: "98765432", // Requis pour Tuteur
      gender: "Male",
      birthDate: "1980-01-01",
      address: { street: "Rue Test", city: "Ville Test", postalCode: "1000" },
      // Pas de studentData, speciality, workload pour un Tuteur (serait 'forbidden')
    };
  });

  // --- Tests sur les champs communs ---

  // Test : Vérifie la longueur minimale du prénom
  it("devrait échouer si firstName a moins de 3 caractères", () => {
    // Modifier les données valides pour ce cas de test
    validTutorData.firstName = "Al"; // Moins de 3 caractères
    // Appeler la fonction de validation Joi
    const { error } = validateUser(validTutorData);
    // Vérifier qu'une erreur est retournée
    expect(error).toBeDefined();
    // Vérifier que le message d'erreur concerne bien 'firstName' et la longueur minimale
    expect(error.details[0].message).toContain(
      '"firstName" length must be at least 3'
    );
  });

  // Test : Vérifie le format de l'email
  it("devrait échouer si email est invalide", () => {
    validTutorData.email = "email_invalide"; // Pas un format email
    const { error } = validateUser(validTutorData);
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"email" must be a valid email');
  });

  // --- Tests sur les champs conditionnels (par rôle) ---

  // Test : Vérifie que 'identifier' est requis pour un Enseignant
  it('devrait échouer si role="Enseignant" mais "identifier" est manquante', () => {
    const teacherData = { ...validTutorData, role: ROLES.TEACHER };
    delete teacherData.identifier;

    const { error } = validateUser(teacherData);
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"identifier" is required');
  });

  // Test : Vérifie que 'identifier' (8 chiffres) est requis pour un Tuteur
  it("devrait échouer si role='Tuteur' mais 'identifier' est invalide (pas 8 chiffres)", () => {
    validTutorData.identifier = "12345"; // Format incorrect
    const { error } = validateUser(validTutorData);
    expect(error).toBeDefined();
    // Vérifie si l'erreur correspond au pattern regex pour l'identifier
    expect(error.details[0].message).toContain(
      "fails to match the required pattern"
    );
  });

  // Test : Vérifie que 'phoneNumber' est requis pour un Tuteur
  it("devrait échouer si role='Tuteur' mais 'phoneNumber' est manquant", () => {
    delete validTutorData.phoneNumber; // Supprimer le champ requis
    const { error } = validateUser(validTutorData);
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain('"phoneNumber" is required');
  });

  // Test : Vérifie que 'firstName' est requis pour un Élève
  it("devrait échouer si role='Elève' mais 'firstName' est manquant", () => {
    const studentData = { ...validTutorData, role: ROLES.STUDENT };
    // Supprimer les champs spécifiques/interdits
    delete studentData.identifier;
    delete studentData.phoneNumber;
    delete studentData.firstName;
    // studentData est manquant

    const { error } = validateUser(studentData);
    expect(error).toBeDefined();
    // Joi se plaint soit de studentData manquant, soit des champs interdits
    expect(error.details[0].message).toContain('"firstName" is required');
  });

  // Test : Vérifie que 'speciality' est interdit pour un Élève
  it("devrait échouer si role='Elève' mais 'speciality' est fourni", () => {
    const studentData = {
      ...validTutorData,
      role: ROLES.STUDENT,
      studentData: { tutor: "id_tuteur", level: "id_level" }, // Requis pour élève
      speciality: "Intrus", // Champ interdit pour élève
    };
    delete studentData.identifier;
    delete studentData.phoneNumber;

    const { error } = validateUser(studentData);
    expect(error).toBeDefined();
    // Joi interdit explicitement ce champ pour ce rôle
    expect(error.details[0].message).toContain('"speciality" is not allowed');
  });

  // --- Test Nominal (Doit passer) ---

  // Test : Vérifie qu'un objet Tuteur complètement valide passe la validation
  it("devrait passer pour un Tuteur avec toutes les données valides", () => {
    // Utilise les données de base 'validTutorData' non modifiées
    const { error } = validateUser(validTutorData);
    // Aucune erreur ne doit être retournée
    expect(error).toBeUndefined();
  });

  it("devrait passer pour un Enseignant valide", () => {
    const teacherData = {
      firstName: "Marie",
      lastName: "Curie",
      email: "marie.curie@app.com",
      identifier: "87654321",
      role: ROLES.TEACHER,
      phoneNumber: "11223344",
      gender: "Female",
      birthDate: "1867-11-07",
      address: { street: "Rue Test", city: "Ville Test", postalCode: "1000" },
      speciality: "Physique",
      workload: 18,
    };
    const { error } = validateUser(teacherData);
    expect(error).toBeUndefined();
  });

  it("devrait passer pour un Elève valide", () => {
    const studentData = {
      firstName: "Albert",
      lastName: "Einstein",
      email: "albert.einstein@app.com",
      role: ROLES.STUDENT,
      gender: "Male",
      birthDate: "1879-03-14",
      address: { street: "Rue Test", city: "Ville Test", postalCode: "1000" },
      studentData: { tutor: "id_tuteur_valide", level: "id_level_valide" },
    };
    const { error } = validateUser(studentData);
    expect(error).toBeUndefined();
  });
});
