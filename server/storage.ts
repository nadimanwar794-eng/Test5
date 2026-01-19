import { 
  type Student,
  type Subject,
  type Mark,
  type StudentWithMarks,
  type Admin,
  type Session,
  type Class,
  type Setting,
  admins,
  sessions,
  classes,
  students,
  subjects,
  marks,
  settings,
  insertAdminSchema,
  insertSessionSchema,
  insertClassSchema,
  insertStudentSchema,
  insertSubjectSchema,
  insertMarkSchema
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";

export interface IStorage {
  // Students
  getStudents(): Promise<StudentWithMarks[]>;
  getStudent(id: number): Promise<StudentWithMarks | undefined>;
  createStudent(student: Student): Promise<Student>;
  updateStudent(id: number, update: Partial<Student>): Promise<Student>;
  deleteStudent(id: number): Promise<void>;
  
  // Subjects
  getSubjects(): Promise<Subject[]>;
  createSubject(subject: Subject): Promise<Subject>;
  updateSubject(id: number, subject: Partial<Subject>): Promise<Subject>;
  deleteSubject(id: number): Promise<void>;
  
  // Marks
  updateMark(studentId: number, subjectId: number, obtained: string): Promise<Mark>;
  deleteMark(id: number): Promise<void>;

  // Auth & Admin
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAdmin(id: number): Promise<Admin | undefined>;
  createAdmin(admin: Admin): Promise<Admin>;

  // Sessions
  getSessions(): Promise<Session[]>;
  createSession(session: Session): Promise<Session>;
  deleteSession(id: number): Promise<void>;

  // Classes
  getClasses(sessionId?: number): Promise<Class[]>;
  createClass(cls: Class): Promise<Class>;
  deleteClass(id: number): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getStudents(): Promise<StudentWithMarks[]> {
    const allStudents = await db.select().from(students);
    const results: StudentWithMarks[] = [];

    for (const student of allStudents) {
      const studentMarks = await db.query.marks.findMany({
        where: eq(marks.studentId, student.id),
        with: {
          subject: true
        }
      });
      results.push({ ...student, marks: studentMarks as any });
    }
    return results;
  }

  async getStudent(id: number): Promise<StudentWithMarks | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) return undefined;

    const studentMarks = await db.query.marks.findMany({
      where: eq(marks.studentId, id),
      with: {
        subject: true
      }
    });

    return { ...student, marks: studentMarks as any };
  }

  async createStudent(insertStudent: any): Promise<Student> {
    const [student] = await db.insert(students).values(insertStudent).returning();
    
    // Auto-create marks for existing subjects in this class
    const classSubjects = await db.select().from(subjects).where(eq(subjects.classId, student.classId));
    
    if (classSubjects.length > 0) {
      for (const sub of classSubjects) {
        await db.insert(marks).values({
          studentId: student.id,
          subjectId: sub.id,
          obtained: "0"
        });
      }
    }

    return student;
  }

  async updateStudent(id: number, update: Partial<Student>): Promise<Student> {
    const [updated] = await db.update(students).set(update).where(eq(students.id, id)).returning();
    if (!updated) throw new Error("Student not found");
    return updated;
  }

  async deleteStudent(id: number): Promise<void> {
    await db.delete(marks).where(eq(marks.studentId, id));
    await db.delete(students).where(eq(students.id, id));
  }

  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects);
  }

  async createSubject(insertSubject: any): Promise<Subject> {
    const [subject] = await db.insert(subjects).values(insertSubject).returning();
    
    // Auto-create "0" marks for all students in the class
    const classStudents = await db.select().from(students).where(eq(students.classId, subject.classId));
    
    if (classStudents.length > 0) {
      for (const s of classStudents) {
        await db.insert(marks).values({
          studentId: s.id,
          subjectId: subject.id,
          obtained: "0"
        });
      }
    }

    return subject;
  }

  async updateSubject(id: number, update: Partial<Subject>): Promise<Subject> {
    const [updated] = await db.update(subjects).set(update).where(eq(subjects.id, id)).returning();
    if (!updated) throw new Error("Subject not found");
    return updated;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(marks).where(eq(marks.subjectId, id));
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async updateMark(studentId: number, subjectId: number, obtained: string): Promise<Mark> {
    const [existing] = await db.select().from(marks).where(
      and(eq(marks.studentId, studentId), eq(marks.subjectId, subjectId))
    );

    if (existing) {
      const [updated] = await db.update(marks)
        .set({ obtained: obtained.toString() })
        .where(eq(marks.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(marks).values({
        studentId,
        subjectId,
        obtained: obtained.toString()
      }).returning();
      return inserted;
    }
  }

  async deleteMark(id: number): Promise<void> {
    await db.delete(marks).where(eq(marks.id, id));
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async createAdmin(insertAdmin: any): Promise<Admin> {
    const [admin] = await db.insert(admins).values({ ...insertAdmin, isSuperAdmin: false }).returning();
    return admin;
  }

  async getSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }

  async createSession(insertSession: any): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async deleteSession(id: number): Promise<void> {
    const sessionClasses = await db.select().from(classes).where(eq(classes.sessionId, id));
    for (const cls of sessionClasses) {
      await this.deleteClass(cls.id);
    }
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getClasses(sessionId?: number): Promise<Class[]> {
    if (sessionId !== undefined) {
      return await db.select().from(classes).where(eq(classes.sessionId, sessionId));
    }
    return await db.select().from(classes);
  }

  async createClass(insertClass: any): Promise<Class> {
    const [cls] = await db.insert(classes).values(insertClass).returning();
    return cls;
  }

  async deleteClass(id: number): Promise<void> {
    const classStudents = await db.select().from(students).where(eq(students.classId, id));
    for (const student of classStudents) {
      await this.deleteStudent(student.id);
    }

    const classSubjects = await db.select().from(subjects).where(eq(subjects.classId, id));
    for (const subject of classSubjects) {
      await this.deleteSubject(subject.id);
    }

    await db.delete(classes).where(eq(classes.id, id));
  }
}

export const storage = new PostgresStorage();
