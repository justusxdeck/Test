# limits

Ein Claude Code Mod, der deine Nutzungslimits im Blick behält. Rechts neben dem Chat erscheint ein Panel mit:

- **Session (5 Std.)**: wie viel vom 5-Stunden-Limit verbraucht ist, mit Zeit bis zum Reset
- **Woche (7 Tage)**: wie viel vom Wochenlimit verbraucht ist, mit Zeit bis zum Reset
- **Kontext dieser Session**: wie voll das Kontextfenster ist
- **Kosten dieser Session**

Die Balken sind grün, ab 70 % gelb und ab 90 % rot. Die Werte werden nach jeder Antwort von Claude aktualisiert. Zusätzlich steht eine kurze Zusammenfassung in der Statuszeile unter dem Eingabefeld.

`/limits` öffnet das Panel und gibt die aktuellen Werte auch als Text aus. Das ist praktisch in Cloud-Sessions, in denen die App kein Panel zeichnet.

## Installieren

Im Terminal in einer Claude Code Session:

```
/plugin install limits --marketplace justusxdeck/Test
```

Aus der Shell:

```
claude plugin install limits --marketplace justusxdeck/Test
```

In der Desktop-App: Auf das + neben dem Eingabefeld klicken, dann Plugins, Add marketplace mit `justusxdeck/Test`, dann Add plugin.

Der Mod liest nur die Limit-Werte, die Claude Code ohnehin anzeigt. Er sendet nichts nach außen und speichert nichts außerhalb der Session.
