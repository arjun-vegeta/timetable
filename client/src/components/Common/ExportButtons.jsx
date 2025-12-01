import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useState } from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ExportButtons({ timetable, timetables, timeSlots, semester, section, viewMode = 'original', classes = [] }) {
  
  // Normalize timetable data - handle both single timetable array and timetables object
  const normalizedTimetable = timetable || (timetables ? Object.values(timetables).flat() : []);
  
  // Get unique time slots from timetable or use defaults
  const getTimeSlots = () => {
    if (timeSlots && timeSlots.length > 0) {
      return timeSlots;
    }
    // Extract from timetable data
    const slots = [...new Set(normalizedTimetable.map(t => t.slot_number))].sort((a, b) => a - b);
    return slots.map(s => {
      const slotData = normalizedTimetable.find(t => t.slot_number === s);
      return { 
        slot: s, 
        start: slotData?.time_start || `${8 + s}:00`, 
        end: slotData?.time_end || `${9 + s}:00` 
      };
    });
  };

  // Get unique sections from timetable for master view
  const getUniqueSections = () => {
    // If classes prop is provided, use that
    if (classes && classes.length > 0) {
      return classes.map(c => `${c.program}-Y${c.year}-${c.section}`);
    }
    // Otherwise extract from timetable data
    const sections = new Set();
    normalizedTimetable.forEach(t => {
      if (t.program && t.section) {
        sections.add(`${t.program}-Y${t.year}-${t.section}`);
      }
    });
    return [...sections].sort();
  };

  const exportToExcel = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slots = getTimeSlots();
    const wb = XLSX.utils.book_new();
    
    const isMasterView = viewMode === 'master' || classes.length > 1;
    const sections = isMasterView ? getUniqueSections() : [section];
    
    if (isMasterView && sections.length > 1) {
      // Master view: Day first, then all sections for that day
      const timetableHeader = ['Day', 'Section', ...slots.map(s => `${s.start}-${s.end}`)];
      const timetableRows = [];
      
      days.forEach(day => {
        sections.forEach(sec => {
          const sectionTimetable = normalizedTimetable.filter(t => 
            `${t.program}-Y${t.year}-${t.section}` === sec
          );
          
          timetableRows.push([
            day,
            sec,
            ...slots.map(slot => {
              const slotData = sectionTimetable.find(t => t.day === day && t.slot_number === slot.slot);
              return slotData?.course_code || '';
            })
          ]);
        });
      });

      const timetableData = [timetableHeader, ...timetableRows];
      const ws = XLSX.utils.aoa_to_sheet(timetableData);
      ws['!cols'] = [{ wch: 12 }, { wch: 18 }, ...slots.map(() => ({ wch: 12 }))];
      XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
    } else {
      // Single section view
      const timetableHeader = ['Day', ...slots.map(s => `${s.start}-${s.end}`)];
      const timetableRows = days.map(day => [
        day,
        ...slots.map(slot => {
          const slotData = normalizedTimetable.find(t => t.day === day && t.slot_number === slot.slot);
          return slotData?.course_code || '';
        })
      ]);

      const timetableData = [timetableHeader, ...timetableRows];
      const ws = XLSX.utils.aoa_to_sheet(timetableData);
      ws['!cols'] = [{ wch: 12 }, ...slots.map(() => ({ wch: 12 }))];
      XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
    }
    
    // Course Details sheet - grouped by Program > Year with S1/S2 columns for master view
    const isMasterExport = viewMode === 'master' || classes.length > 1;
    
    if (isMasterExport) {
      // Group courses by program-year and section
      const coursesByProgramYear = {};
      normalizedTimetable.forEach(slot => {
        if (slot.course_code && slot.program) {
          const pyKey = `${slot.program}-Y${slot.year}`;
          if (!coursesByProgramYear[pyKey]) {
            coursesByProgramYear[pyKey] = { program: slot.program, year: slot.year, s1: new Map(), s2: new Map() };
          }
          const sectionMap = slot.section === 'S1' ? 's1' : 's2';
          if (!coursesByProgramYear[pyKey][sectionMap].has(slot.course_code)) {
            // Determine course type label
            let typeLabel = '';
            if (slot.is_elective) typeLabel = 'Elective';
            else if (slot.is_minor) typeLabel = 'Minor';
            else if (slot.course_type === 'major_project') typeLabel = 'Major Project';
            else if (slot.course_type === 'minor_project') typeLabel = 'Minor Project';
            
            coursesByProgramYear[pyKey][sectionMap].set(slot.course_code, {
              code: slot.course_code,
              name: slot.course_name || '-',
              instructor: slot.instructor || '-',
              lecture: slot.lecture_hours ?? '-',
              tutorial: slot.tutorial_hours ?? '-',
              practical: slot.practical_hours ?? '-',
              room: slot.room_lab || slot.classroom || '-',
              type: typeLabel
            });
          }
        }
      });
      
      // Sort by program, year
      const sortedProgramYears = Object.entries(coursesByProgramYear).sort((a, b) => {
        if (a[1].program !== b[1].program) return a[1].program.localeCompare(b[1].program);
        return a[1].year - b[1].year;
      });
      
      const courseData = [];
      sortedProgramYears.forEach(([pyKey, data]) => {
        const s1Courses = Array.from(data.s1.values());
        const s2Courses = Array.from(data.s2.values());
        
        // Find truly common courses (same code AND same instructor)
        const s1Map = new Map(s1Courses.map(c => [c.code, c]));
        const s2Map = new Map(s2Courses.map(c => [c.code, c]));
        
        const commonCourses = [];
        const s1Only = [];
        const s2Only = [];
        
        s1Courses.forEach(c => {
          const s2Course = s2Map.get(c.code);
          if (s2Course && s2Course.instructor === c.instructor) {
            if (!commonCourses.find(x => x.code === c.code)) {
              commonCourses.push(c);
            }
          } else {
            s1Only.push(c);
          }
        });
        
        s2Courses.forEach(c => {
          const s1Course = s1Map.get(c.code);
          if (!s1Course || s1Course.instructor !== c.instructor) {
            s2Only.push(c);
          }
        });
        
        // Add program-year header
        courseData.push([`${data.program} - Year ${data.year}`, '', '', '', '', '', '', '', '']);
        
        // Common courses
        if (commonCourses.length > 0) {
          courseData.push(['Common (S1 & S2)', 'Code', 'Course Name', 'Instructor', 'Type', 'L', 'T', 'P', 'Room']);
          commonCourses.forEach(c => {
            courseData.push(['', c.code, c.name, c.instructor, c.type || '', c.lecture, c.tutorial, c.practical, c.room]);
          });
        }
        
        // S1 only courses
        if (s1Only.length > 0) {
          courseData.push(['S1 Only', 'Code', 'Course Name', 'Instructor', 'Type', 'L', 'T', 'P', 'Room']);
          s1Only.forEach(c => {
            courseData.push(['', c.code, c.name, c.instructor, c.type || '', c.lecture, c.tutorial, c.practical, c.room]);
          });
        }
        
        // S2 only courses
        if (s2Only.length > 0) {
          courseData.push(['S2 Only', 'Code', 'Course Name', 'Instructor', 'Type', 'L', 'T', 'P', 'Room']);
          s2Only.forEach(c => {
            courseData.push(['', c.code, c.name, c.instructor, c.type || '', c.lecture, c.tutorial, c.practical, c.room]);
          });
        }
        
        courseData.push(['', '', '', '', '', '', '', '', '']); // Empty row between program-years
      });
      
      if (courseData.length > 0) {
        const wsCourses = XLSX.utils.aoa_to_sheet(courseData);
        wsCourses['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses');
      }
    } else {
      // Single section - simple list
      const uniqueCourses = [];
      const seenCodes = new Set();
      normalizedTimetable.forEach(slot => {
        if (slot.course_code && !seenCodes.has(slot.course_code)) {
          seenCodes.add(slot.course_code);
          uniqueCourses.push({
            code: slot.course_code,
            name: slot.course_name || '-',
            instructor: slot.instructor || '-',
            lecture: slot.lecture_hours ?? '-',
            tutorial: slot.tutorial_hours ?? '-',
            practical: slot.practical_hours ?? '-',
            room: slot.room_lab || slot.classroom || '-'
          });
        }
      });
      
      if (uniqueCourses.length > 0) {
        const courseHeader = ['Code', 'Course Name', 'Instructor', 'L', 'T', 'P', 'Room'];
        const courseRows = uniqueCourses.map(c => [c.code, c.name, c.instructor, c.lecture, c.tutorial, c.practical, c.room]);
        const courseData = [courseHeader, ...courseRows];
        const wsCourses = XLSX.utils.aoa_to_sheet(courseData);
        wsCourses['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses');
      }
    }
    
    const fileName = `Timetable_${semester}_${viewMode}.xlsx`.replace(/[\\/*?[\]:]/g, '_');
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slots = getTimeSlots();
    
    const isMasterView = viewMode === 'master' || classes.length > 1;
    const sections = isMasterView ? getUniqueSections() : [section];
    
    // Title
    doc.setFontSize(16);
    doc.setTextColor(51, 51, 51);
    doc.text(`Timetable - ${semester}`, 148, 12, { align: 'center' });
    
    if (isMasterView && sections.length > 1) {
      // Master view: Day first, then all sections for that day
      const tableData = [];
      
      days.forEach(day => {
        sections.forEach(sec => {
          const sectionTimetable = normalizedTimetable.filter(t => 
            `${t.program}-Y${t.year}-${t.section}` === sec
          );
          
          tableData.push([
            day,
            sec,
            ...slots.map(slot => {
              const slotData = sectionTimetable.find(t => t.day === day && t.slot_number === slot.slot);
              return slotData?.course_code || '-';
            })
          ]);
        });
      });

      const headers = [['Day', 'Section', ...slots.map(s => `${s.start}\n${s.end}`)]];

      doc.autoTable({
        head: headers,
        body: tableData,
        startY: 18,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle', halign: 'center' },
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 6 },
        columnStyles: { 
          0: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'left', cellWidth: 18 },
          1: { fillColor: [248, 250, 252], halign: 'left', cellWidth: 28 }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 1 && data.cell.raw !== '-') {
            data.cell.styles.fillColor = [238, 242, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      // Course details table for master view - grouped by Program > Year with S1/S2 columns
      const coursesByProgramYear = {};
      normalizedTimetable.forEach(slot => {
        if (slot.course_code && slot.program) {
          const pyKey = `${slot.program}-Y${slot.year}`;
          if (!coursesByProgramYear[pyKey]) {
            coursesByProgramYear[pyKey] = { program: slot.program, year: slot.year, s1: new Map(), s2: new Map() };
          }
          const sectionMap = slot.section === 'S1' ? 's1' : 's2';
          if (!coursesByProgramYear[pyKey][sectionMap].has(slot.course_code)) {
            // Determine course type label
            let typeLabel = '';
            if (slot.is_elective) typeLabel = 'Elective';
            else if (slot.is_minor) typeLabel = 'Minor';
            else if (slot.course_type === 'major_project') typeLabel = 'Major Project';
            else if (slot.course_type === 'minor_project') typeLabel = 'Minor Project';
            
            coursesByProgramYear[pyKey][sectionMap].set(slot.course_code, {
              code: slot.course_code,
              name: slot.course_name || '-',
              instructor: slot.instructor || '-',
              lecture: slot.lecture_hours ?? '-',
              tutorial: slot.tutorial_hours ?? '-',
              practical: slot.practical_hours ?? '-',
              type: typeLabel
            });
          }
        }
      });
      
      // Sort by program, year
      const sortedProgramYears = Object.entries(coursesByProgramYear).sort((a, b) => {
        if (a[1].program !== b[1].program) return a[1].program.localeCompare(b[1].program);
        return a[1].year - b[1].year;
      });
      
      if (sortedProgramYears.length > 0) {
        let currentY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);
        doc.text('Course Details', 14, currentY);
        currentY += 6;
        
        sortedProgramYears.forEach(([pyKey, data]) => {
          const s1Courses = Array.from(data.s1.values());
          const s2Courses = Array.from(data.s2.values());
          
          // Find truly common courses (same code AND same instructor in both sections)
          const s1Map = new Map(s1Courses.map(c => [c.code, c]));
          const s2Map = new Map(s2Courses.map(c => [c.code, c]));
          
          const commonCourses = [];
          const s1Only = [];
          const s2Only = [];
          
          s1Courses.forEach(c => {
            const s2Course = s2Map.get(c.code);
            if (s2Course && s2Course.instructor === c.instructor) {
              // Same code and instructor - truly common
              if (!commonCourses.find(x => x.code === c.code)) {
                commonCourses.push(c);
              }
            } else {
              // Different instructor or not in S2 - S1 only
              s1Only.push(c);
            }
          });
          
          s2Courses.forEach(c => {
            const s1Course = s1Map.get(c.code);
            if (!s1Course || s1Course.instructor !== c.instructor) {
              // Not in S1 or different instructor - S2 only
              s2Only.push(c);
            }
          });
          
          // Program-Year header
          doc.setFontSize(10);
          doc.setTextColor(51, 51, 51);
          doc.setFont(undefined, 'bold');
          doc.text(`${data.program} - Year ${data.year}`, 14, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 5;
          
          // Common courses (full width)
          if (commonCourses.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text('Common (S1 & S2)', 14, currentY);
            
            doc.autoTable({
              head: [['Code', 'Course Name', 'Instructor', 'Type', 'L', 'T', 'P']],
              body: commonCourses.map(c => [c.code, c.name.substring(0, 35), c.instructor.substring(0, 18), c.type || '', c.lecture, c.tutorial, c.practical]),
              startY: currentY + 2,
              theme: 'grid',
              styles: { fontSize: 7, cellPadding: 1.5 },
              headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 6 },
              columnStyles: { 0: { fontStyle: 'bold' }, 3: { halign: 'center', fontStyle: 'italic' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
              margin: { left: 14, right: 14 }
            });
            currentY = doc.lastAutoTable.finalY + 4;
          }
          
          // Section-specific courses (side by side)
          if (s1Only.length > 0 || s2Only.length > 0) {
            const pageWidth = doc.internal.pageSize.getWidth();
            const colWidth = (pageWidth - 28) / 2 - 2;
            
            // S1 column
            if (s1Only.length > 0) {
              doc.setFontSize(8);
              doc.setTextColor(71, 85, 105);
              doc.text('Section S1 Only', 14, currentY);
              
              doc.autoTable({
                head: [['Code', 'Course', 'Type']],
                body: s1Only.map(c => [c.code, c.name.substring(0, 18), c.type || '']),
                startY: currentY + 2,
                theme: 'grid',
                styles: { fontSize: 6, cellPadding: 1 },
                headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 5 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 18 }, 1: { cellWidth: 32 }, 2: { cellWidth: 22, fontStyle: 'italic' } },
                tableWidth: colWidth,
                margin: { left: 14 }
              });
            }
            
            // S2 column
            if (s2Only.length > 0) {
              doc.setFontSize(8);
              doc.setTextColor(71, 85, 105);
              doc.text('Section S2 Only', pageWidth / 2 + 2, currentY);
              
              doc.autoTable({
                head: [['Code', 'Course', 'Type']],
                body: s2Only.map(c => [c.code, c.name.substring(0, 18), c.type || '']),
                startY: currentY + 2,
                theme: 'grid',
                styles: { fontSize: 6, cellPadding: 1 },
                headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 5 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 18 }, 1: { cellWidth: 32 }, 2: { cellWidth: 22, fontStyle: 'italic' } },
                tableWidth: colWidth,
                margin: { left: pageWidth / 2 + 2 }
              });
            }
            
            currentY = doc.lastAutoTable.finalY + 6;
          } else {
            currentY += 4;
          }
        });
      }
    } else {
      // Single section view
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Section ${section} | ${viewMode === 'cr' ? 'CR Modified' : 'Original'}`, 148, 18, { align: 'center' });
      
      const tableData = days.map(day => [
        day,
        ...slots.map(slot => {
          const slotData = normalizedTimetable.find(t => t.day === day && t.slot_number === slot.slot);
          return slotData?.course_code || '-';
        })
      ]);

      const headers = [['Day', ...slots.map(s => `${s.start}\n${s.end}`)]];

      doc.autoTable({
        head: headers,
        body: tableData,
        startY: 24,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle', halign: 'center' },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 0: { fillColor: [241, 245, 249], fontStyle: 'bold', halign: 'left' } },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 0 && data.cell.raw !== '-') {
            data.cell.styles.fillColor = [238, 242, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      // Course details table
      const uniqueCourses = [];
      const seenCodes = new Set();
      normalizedTimetable.forEach(slot => {
        if (slot.course_code && !seenCodes.has(slot.course_code)) {
          seenCodes.add(slot.course_code);
          uniqueCourses.push([
            slot.course_code,
            (slot.course_name || '-').substring(0, 30),
            (slot.instructor || '-').substring(0, 18),
            slot.lecture_hours ?? '-',
            slot.tutorial_hours ?? '-',
            slot.practical_hours ?? '-'
          ]);
        }
      });
      
      if (uniqueCourses.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text('Course Details', 14, finalY);
        
        doc.autoTable({
          head: [['Code', 'Course Name', 'Instructor', 'L', 'T', 'P']],
          body: uniqueCourses,
          startY: finalY + 2,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 7 },
          columnStyles: { 0: { fontStyle: 'bold' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } }
        });
      }
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, 148, 200, { align: 'center' });
    }

    const fileName = `Timetable_${semester}_${viewMode}.pdf`.replace(/[\\/*?[\]:]/g, '_');
    doc.save(fileName);
  };

  const exportToCalendar = () => {
    const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
    
    const getNextDay = (dayName) => {
      const today = new Date();
      const targetDay = dayMap[dayName];
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntil);
      return nextDate;
    };
    
    const formatICSDate = (date) => {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };
    
    const generateUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@timetable`;
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Timetable App//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${semester} Timetable`
    ];
    
    normalizedTimetable.forEach(slot => {
      if (slot.course_code && slot.day && slot.time_start && slot.time_end) {
        const eventDate = getNextDay(slot.day);
        const [startHour, startMin] = slot.time_start.split(':').map(Number);
        const [endHour, endMin] = slot.time_end.split(':').map(Number);
        
        const startDateTime = new Date(eventDate);
        startDateTime.setHours(startHour, startMin, 0);
        
        const endDateTime = new Date(eventDate);
        endDateTime.setHours(endHour, endMin, 0);
        
        const summary = `${slot.course_code}${slot.section ? ` (${slot.section})` : ''}`;
        const description = [slot.course_name, slot.instructor ? `Instructor: ${slot.instructor}` : ''].filter(Boolean).join('\\n');
        const location = slot.room_lab || slot.classroom || '';
        
        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${generateUID()}`,
          `DTSTAMP:${formatICSDate(new Date())}`,
          `DTSTART:${formatICSDate(startDateTime)}`,
          `DTEND:${formatICSDate(endDateTime)}`,
          'RRULE:FREQ=WEEKLY;COUNT=16',
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          `LOCATION:${location}`,
          'END:VEVENT'
        );
      }
    });
    
    icsContent.push('END:VCALENDAR');
    
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Timetable_${semester}_${viewMode}.ics`.replace(/[\\/*?[\]:]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
        className="h-8 text-xs gap-1.5"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        className="h-8 text-xs gap-1.5"
      >
        <FileText className="w-3.5 h-3.5" />
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCalendar}
        className="h-8 text-xs gap-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        .ics
      </Button>
    </div>
  );
}

export default ExportButtons;
