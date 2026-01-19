import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { hashPassword } from "./auth";
import { insertAdminSchema, insertSessionSchema, insertClassSchema } from "@shared/schema";

const SEED_DATA = [
  { rollNo: 1, name: "Aakash Yadav", obtained: 54, max: 80 },
  { rollNo: 2, name: "Aryan Kumar", obtained: 51, max: 80 },
  { rollNo: 3, name: "Rahul Kumar", obtained: 70, max: 80 },
  { rollNo: 4, name: "Aman Kumar", obtained: 46, max: 80 },
  { rollNo: 5, name: "Prince Kumar", obtained: 0, max: 80 },
  { rollNo: 6, name: "Faiz Raza", obtained: 58, max: 80 },
  { rollNo: 7, name: "Meraj Alam", obtained: 0, max: 80 },
  { rollNo: 8, name: "Afroz", obtained: 0, max: 80 },
  { rollNo: 9, name: "Ismail", obtained: 0, max: 80 },
  { rollNo: 10, name: "Khusboo", obtained: 62, max: 80 },
  { rollNo: 11, name: "Salma Parveen", obtained: 0, max: 80 },
  { rollNo: 12, name: "Aaisha Khatoon", obtained: 49, max: 80 },
  { rollNo: 13, name: "Sahima", obtained: 0, max: 80 },
  { rollNo: 14, name: "Aashiya", obtained: 45, max: 80 },
  { rollNo: 15, name: "Shanzida", obtained: 36, max: 80 },
  { rollNo: 16, name: "Maimuna", obtained: 68, max: 80 },
  { rollNo: 17, name: "Soha", obtained: 56, max: 80 },
  { rollNo: 18, name: "Naziya (U)", obtained: 58, max: 80 },
  { rollNo: 19, name: "Jashmin", obtained: 56, max: 80 },
  { rollNo: 20, name: "Usha Kumari", obtained: 38, max: 80 },
  { rollNo: 21, name: "Gungun", obtained: 54, max: 80 },
  { rollNo: 22, name: "Naziya (D)", obtained: 45, max: 80 },
  { rollNo: 23, name: "Shahina Khatoon", obtained: 60, max: 80 },
  { rollNo: 24, name: "Sonam Kumari", obtained: 40, max: 80 },
  { rollNo: 25, name: "Farzana", obtained: 65, max: 80 },
  { rollNo: 26, name: "Muskan Khatoon", obtained: 53, max: 80 },
  { rollNo: 27, name: "Sabina", obtained: 60, max: 80 },
  { rollNo: 28, name: "Farhin", obtained: 0, max: 80 },
  { rollNo: 29, name: "Sanaa Parveen", obtained: 66, max: 80 },
  { rollNo: 30, name: "Rani Parveen", obtained: 56, max: 80 },
  { rollNo: 31, name: "Gulafsa", obtained: 68, max: 80 },
  { rollNo: 32, name: "Sajiya Khatoon", obtained: 54, max: 80 },
  { rollNo: 33, name: "Amarjit Kumar", obtained: 47, max: 80 },
  { rollNo: 34, name: "Prince Yadav", obtained: 21, max: 80 },
  { rollNo: 35, name: "Tabrez", obtained: 41, max: 80 },
  { rollNo: 36, name: "Faiz", obtained: 0, max: 80 },
  { rollNo: 37, name: "Muskan II", obtained: 0, max: 80 },
  { rollNo: 38, name: "Tahir", obtained: 40, max: 80 },
  { rollNo: 39, name: "Anshu Kumari", obtained: 0, max: 80 }
];

async function seedDatabase() {
  // Seed Admin
  const existingAdmin = await storage.getAdminByEmail("Nadimanwar794@gmail.com");
  if (!existingAdmin) {
    console.log("Seeding default admin...");
    const hashedPassword = await hashPassword("ns841414");
    await storage.createAdmin({
      name: "Default Admin",
      email: "Nadimanwar794@gmail.com",
      password: hashedPassword,
      isSuperAdmin: true
    } as any);
  }

  // Seed Session & Class
  const sessions = await storage.getSessions();
  let session2526 = sessions.find(s => s.name === "2025-26");
  
  if (!session2526) {
    console.log("Seeding session 2025-26...");
    session2526 = await storage.createSession({
      name: "2025-26",
      isActive: true
    } as any);
  }

  const classesInSession = await storage.getClasses(session2526.id);
  let class10th = classesInSession.find(c => c.name === "Class 10th");

  if (!class10th) {
    console.log("Seeding Class 10th for 2025-26...");
    class10th = await storage.createClass({
      name: "Class 10th",
      sessionId: session2526.id
    } as any);
  }

  // Check if students already exist for this class
  const students = await storage.getStudents();
  const classStudents = students.filter(s => s.classId === class10th!.id);

  if (classStudents.length === 0) {
    console.log("Seeding 39 students for Class 10th...");
    
    const subject = await storage.createSubject({
      name: "IIC Annual Test 2026",
      date: "2026-01-18",
      maxMarks: 80,
      classId: class10th.id
    } as any);

    for (const data of SEED_DATA) {
      const student = await storage.createStudent({
        rollNo: data.rollNo,
        name: data.name,
        classId: class10th.id,
        isPaid: true
      } as any);
      
      await storage.updateMark(student.id, subject.id, data.obtained.toString());
    }
  }
}

function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized: Admin access required" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  // --- Auth & Admin Routes ---

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({ message: "Not logged in" });
  });

  app.post("/api/login", (req, res, next) => {
    // @ts-ignore - passport type issues
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.status(204).send();
    });
  });

  app.post("/api/register", isAuthenticated, async (req, res) => {
    try {
      const data = insertAdminSchema.parse(req.body);
      const hashedPassword = await hashPassword(data.password);
      const admin = await storage.createAdmin({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        isSuperAdmin: false
      } as any);
      res.status(201).json(admin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // --- Session Routes ---

  app.get("/api/sessions", async (req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertSessionSchema.parse(req.body) as any;
      const session = await storage.createSession(data);
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteSession(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // --- Class Routes ---

  app.get("/api/classes", async (req, res) => {
    const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;
    const classes = await storage.getClasses(sessionId);
    res.json(classes);
  });

  app.post("/api/classes", async (req, res) => {
    try {
      const data = insertClassSchema.parse(req.body) as any;
      const cls = await storage.createClass(data);
      res.status(201).json(cls);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.delete("/api/classes/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteClass(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // --- Student Routes ---

  app.get(api.students.list.path, async (req, res) => {
    // Ideally filter by classId if provided
    const students = await storage.getStudents();
    // Filter by query param if needed, or storage method
    // For now returning all, frontend filters or we optimize later
    res.json(students);
  });

  app.get(api.students.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const student = await storage.getStudent(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  });

  app.post(api.students.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.students.create.input.parse(req.body);
      const student = await storage.createStudent({
        rollNo: input.rollNo,
        name: input.name,
        classId: input.classId,
        isPaid: true
      } as any);
      res.status(201).json(student);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.students.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.students.update.input.parse(req.body);
      const updated = await storage.updateStudent(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.students.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteStudent(id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting student:", err);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // --- Subject Routes ---

  app.post(api.subjects.create.path, async (req, res) => {
    try {
      const input = api.subjects.create.input.parse(req.body);
      const subject = await storage.createSubject({
        name: input.name,
        classId: input.classId,
        date: input.date || null,
        maxMarks: input.maxMarks
      } as any);

      // Link this subject to ALL students in the same class
      const allStudents = await storage.getStudents();
      const classStudents = allStudents.filter(s => s.classId === input.classId);
      
      for (const student of classStudents) {
        // Only add if mark doesn't already exist (idempotency)
        const hasMark = student.marks.some(m => m.subjectId === subject.id);
        if (!hasMark) {
          await storage.updateMark(student.id, subject.id, "0");
        }
      }

      res.status(201).json(subject);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.subjects.list.path, async (req, res) => {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  });

  app.patch(api.subjects.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.subjects.update.input.parse(req.body);
      const updated = await storage.updateSubject(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Subject update error:", err);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.delete(api.subjects.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteSubject(id);
    res.status(204).send();
  });

  // --- Settings Routes ---
  app.get("/api/settings/:key", async (req, res) => {
    const value = await storage.getSetting(req.params.key);
    res.json({ value: value || "" });
  });

  app.post("/api/settings", isAuthenticated, async (req, res) => {
    const { key, value } = req.body;
    await storage.setSetting(key, value);
    res.json({ success: true });
  });

  // --- Marks Routes ---

  app.post(api.marks.update.path, isAuthenticated, async (req, res) => {
    try {
      const { studentId, marks: marksInput } = req.body;
      
      // Get all current marks for this student
      const student = await storage.getStudent(studentId);
      const currentMarkIds = student?.marks.map(m => m.id) || [];
      
      // Update or Create marks
      const updatedMarkIds: number[] = [];
      for (const mark of marksInput) {
        let subjectId: number | undefined;
        
        if (mark.id && !mark.id.toString().startsWith('new-')) {
          const marks = await storage.getStudents().then(students => students.flatMap(s => s.marks));
          const existingMark = marks.find(m => m.id === mark.id);
          if (existingMark) {
            subjectId = existingMark.subjectId;
            // Update subject details
            await storage.updateSubject(subjectId, {
              name: mark.subject,
              maxMarks: mark.max,
              date: mark.date
            });
          }
        }

        if (!subjectId) {
          const subjects = await storage.getSubjects();
          let subject = subjects.find(s => s.name === mark.subject && s.classId === student?.classId);
          
          if (!subject) {
            subject = await storage.createSubject({
              name: mark.subject,
              classId: student!.classId,
              date: mark.date,
              maxMarks: mark.max
            } as any);
          } else {
            await storage.updateSubject(subject.id, {
              maxMarks: mark.max,
              date: mark.date
            });
          }
          subjectId = subject.id;
        }
        
        const updatedMark = await storage.updateMark(studentId, subjectId, mark.obtained.toString());
        updatedMarkIds.push(updatedMark.id);
      }
      
      const marksToDelete = currentMarkIds.filter(id => !updatedMarkIds.includes(id));
      for (const id of marksToDelete) {
        await storage.deleteMark(id);
      }

      res.json({ message: "Marks updated" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update marks" });
    }
  });

  return httpServer;
}
