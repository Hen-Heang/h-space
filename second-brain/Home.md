# My Second Brain

## Diagram

```mermaid
flowchart LR
    Home((🏠 Home))

    Inbox[📥 Inbox<br/>quick captures]
    Daily[📅 Daily Notes]
    Templates[🧩 Templates]

    subgraph Work[💼 Work & Projects]
        HSpace[H-Space]
        Lessons[Development Lessons]
    end

    subgraph Learning[📚 Learning]
        Korean[Korean]
        Java[Java and Spring Boot]
        SQL[SQL]
        AI[AI-Assisted Development]
    end

    subgraph Personal[🌱 Personal]
        Ideas[Ideas]
        Goals[Goals]
    end

    Home --> Inbox
    Home --> Daily
    Home --> Work
    Home --> Learning
    Home --> Personal

    Inbox -. sort later .-> Work
    Inbox -. sort later .-> Learning
    Inbox -. sort later .-> Personal

    Templates -. Daily Note .-> Daily
    Templates -. Development Lesson .-> Lessons

    class HSpace,Lessons,Korean,Java,SQL,AI,Ideas,Goals internal-link
```

## Vault map
- **Inbox/**: quick captures. Sort them into a folder later.
- **Work & Projects/**: project notes and development lessons
- **Learning/**: Java, Spring Boot, SQL, AI-assisted development, Korean
- **Daily Notes/**: one note per days 
- **Templates/**: [[Templates/Daily Note|Daily Note]], [[Templates/Development Lesson|Development Lesson]]

## Work
- [[H-Space]]
- [[Development Lessons]]

## Learning
- [[Korean]]
- [[Java and Spring Boot]]
- [[SQL]]
- [[AI-Assisted Development]]

## Personal
- [[Ideas]]
- [[Goals]]