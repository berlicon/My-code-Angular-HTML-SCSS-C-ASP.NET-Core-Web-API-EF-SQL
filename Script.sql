// *** УДАЛИЛ ПОХОЖИЙ КОД ***

UPDATE t
SET t.Allow_Debug_Login = 1
FROM pref.User_Preference AS t
// *** УДАЛИЛ ПОХОЖИЙ КОД ***
JOIN dic.Ad_Group AS ag ON ag.Id_Group_Ad = alg.Id_Group_Ad
WHERE ag.Name IN ('APP_DWH_COSTCONTROL_DEVELOPERS', 'APP_DWH_COSTCONTROL_ANALYTICS')
GO

DECLARE 
    @DataBase_Name    VARCHAR(255) = '$(Database_name)',
	// *** УДАЛИЛ ПОХОЖИЙ КОД ***
    @Command          VARCHAR(max);

DECLARE synonym_Cursor CURSOR FOR
SELECT 
    l.Synonym_Schema,
    l.Synonym_Name,
    l.[Route]   
FROM [dic].[Linked_Server_Synonym_Route] l 
WHERE l.[DataBase_Name] = @DataBase_Name
ORDER BY l.Id_Linked_Server_Synonym_Route;

OPEN synonym_Cursor

FETCH NEXT FROM synonym_Cursor
INTO @Synonym_Schema, @Synonym_Name, @Route

WHILE @@FETCH_STATUS = 0  
BEGIN 
    SET @Synonym_FullName = @Synonym_Schema + '.' + @Synonym_Name;
    SET @Command = 
    'IF OBJECT_ID(''' + @Synonym_FullName +''') IS NOT NULL DROP SYNONYM ' + @Synonym_FullName + '
     
     CREATE SYNONYM ' + @Synonym_FullName + '
     FOR' + @Route 

    EXEC(@Command) 
    FETCH NEXT FROM synonym_Cursor
    INTO @Synonym_Schema, @Synonym_Name, @Route;
END
CLOSE synonym_Cursor;  
DEALLOCATE synonym_Cursor;  
GO  

